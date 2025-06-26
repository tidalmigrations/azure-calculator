import { azureClient } from '@/lib/api';
import { AzureRetailPrice } from '@/types';
import { normalizeRegion, detectOSType } from '@/utils/helpers';
import { 
  VMCalculationInput, 
  VMCalculationResult, 
  PricingCalculator, 
  CostItem,
  DEFAULT_VM_SIZES,
  OSDetectionResult
} from './types';
import { PricingCacheManager } from './pricingCacheManager';

/**
 * VM Pricing Calculator
 * Calculates Azure VM costs using real Azure Retail Prices API data
 */
export class VMCalculator implements PricingCalculator {
  name = 'Azure Virtual Machines';
  requiredFields = ['region', 'os', 'hoursToRun'];
  private cacheManager?: PricingCacheManager;

  /**
   * Set cache manager for Phase 3.4 - cache-aware calculations
   */
  setCacheManager(cacheManager: PricingCacheManager): void {
    this.cacheManager = cacheManager;
  }

  /**
   * Calculate VM costs for a spreadsheet row
   */
  async calculate(data: any): Promise<CostItem> {
    const input = this.parseInput(data);
    const result = await this.calculateVMCost(input);
    
    return {
      serviceName: this.name,
      cost: result.cost,
      details: result.details
    };
  }

  /**
   * Calculate VM cost with Azure API data
   */
  async calculateVMCost(input: VMCalculationInput): Promise<VMCalculationResult> {
    try {
      // Normalize region name
      const normalizedRegion = normalizeRegion(input.region);
      
      console.log(`🎯 Server Selection - VM Calculation for: ${input.hostname} (${normalizedRegion}, ${input.os})`);
      
      // Phase 3.4: Try cache first, fallback to API calls
      let vmPrices;
      if (this.cacheManager) {
        vmPrices = this.cacheManager.getVMPrices(normalizedRegion, input.os);
        if (vmPrices) {
          console.log(`🚀 Phase 3.4 - Using cached VM prices: ${vmPrices.length} VMs`);
        }
      }
      
      // Fallback to API calls if no cache or cache miss
      if (!vmPrices) {
        console.log(`🔄 Phase 3.4 - Cache miss, fetching from API`);
        try {
          vmPrices = await azureClient.getVMPricesFromCalculator(normalizedRegion, input.os);
          console.log(`🔍 Server Selection - Using Calculator API, found ${vmPrices.length} VMs`);
        } catch (error) {
          console.warn('Calculator API failed, falling back to Retail Prices API:', error);
          vmPrices = await azureClient.getVMPrices(normalizedRegion, input.os);
          console.log(`🔍 Server Selection - Using Retail API fallback, found ${vmPrices.length} VMs`);
        }
      }
      
      if (vmPrices.length === 0) {
        console.warn(`⚠️  No VM prices found for ${input.os} in ${normalizedRegion}, using fallback pricing`);
        return this.getFallbackVMPricing(input);
      }

      // Find the best VM option
      console.log(`🔍 Server Selection - Calling selectBestVM with vmSize: ${input.vmSize}, forcedFamily: ${input.forcedFamily}`);
      const selectedVM = this.selectBestVM(vmPrices, input.vmSize, input.forcedFamily, input.requiredCPUs, input.requiredRAM);
      
      if (!selectedVM) {
        console.warn(`⚠️  No suitable VM found for requirements, using fallback pricing`);
        return this.getFallbackVMPricing(input);
      }

      // Log final VM selection for server
      console.log(`✅ Server Selection - Final VM for ${input.hostname}: ${selectedVM.armSkuName || selectedVM.skuName} at $${selectedVM.unitPrice}/hour`);

      // Extract VM specifications
      const vmSpecs = this.extractVMSpecs(selectedVM.armSkuName || selectedVM.skuName || '');

      // Calculate total cost
      const hourlyRate = selectedVM.unitPrice;
      const totalCost = hourlyRate * input.hoursToRun;

      return {
        cost: totalCost,
        details: {
          vmSize: selectedVM.armSkuName || 'Unknown',
          hourlyRate,
          totalHours: input.hoursToRun,
          osType: input.os,
          region: normalizedRegion,
          skuName: selectedVM.skuName,
          productName: selectedVM.productName,
          currency: selectedVM.currencyCode,
          // Use input requirements as the displayed specs (minimum requirements)
          cpu: input.requiredCPUs || vmSpecs.cpu,
          ram: input.requiredRAM || vmSpecs.ram,
          // Store Azure VM actual specs separately for reference
          azureVMCpu: vmSpecs.cpu,
          azureVMRam: vmSpecs.ram,
          unitOfMeasure: selectedVM.unitOfMeasure,
          hostname: input.hostname,
          requiredCPUs: input.requiredCPUs,
          requiredRAM: input.requiredRAM
        }
      };

    } catch (error) {
      console.warn('VM calculation error, using fallback pricing:', error);
      
      // Check if it's a rate limit error and provide specific messaging
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        console.warn('🚦 VM CALC - Rate limit exceeded, using fallback pricing for VM calculation');
      } else if (error instanceof Error && error.message.includes('429')) {
        console.warn('🚦 VM CALC - Too many requests (429), using fallback pricing for VM calculation');
      } else if (error instanceof Error && error.message.includes('RATE_LIMIT_EXCEEDED')) {
        console.warn('🚦 VM CALC - API rate limit exceeded, using fallback pricing for VM calculation');
      }
      
      // Always fallback to estimated pricing instead of throwing
      return this.getFallbackVMPricing(input);
    }
  }

  /**
   * Parse input data from spreadsheet row
   */
  private parseInput(data: any): VMCalculationInput {
    // Debug: Show raw data being processed
    console.log('🔍 Server Selection - Raw input data:', Object.keys(data));
    console.log('🔍 Server Selection - VM Family field value:', data['VM Family']);
    
    // Extract and validate region
    const region = data.region || data.location || 'eastus';
    
    // Detect OS from various possible field values
    const osDetection = this.detectOSFromData(data);
    
    // Parse hours to run
    const hoursToRun = this.parseHours(data.hoursToRun || data.hours || data.runtime || 24);
    
    // Extract CPU requirements from various field names
    const cpuFields = [
      data.requiredCPUs,
      data.cpuCount,
      data['Logical CPU Count'],
      data['CPU Count'],
      data.cpus,
      data.cores,
      data.processors,
      data.vcpus
    ];
    
    let requiredCPUs: number | undefined;
    for (const field of cpuFields) {
      if (field !== null && field !== undefined && field !== '') {
        const parsed = parseInt(String(field), 10);
        if (!isNaN(parsed) && parsed > 0) {
          requiredCPUs = parsed;
          console.log(`🔍 Server Selection - Found CPU requirement: ${requiredCPUs} CPUs from field value "${field}"`);
          break;
        }
      }
    }
    
    // Extract RAM requirements from various field names
    const ramFields = [
      data.requiredRAM,
      data.ramGB,
      data['RAM Allocated (GB)'],
      data['RAM (GB)'],
      data.memory,
      data.memoryGB,
      data.ram
    ];
    
    let requiredRAM: number | undefined;
    for (const field of ramFields) {
      if (field !== null && field !== undefined && field !== '') {
        const parsed = parseFloat(String(field));
        if (!isNaN(parsed) && parsed > 0) {
          requiredRAM = parsed;
          console.log(`🔍 Server Selection - Found RAM requirement: ${requiredRAM} GB from field value "${field}"`);
          break;
        }
      }
    }
    
    // Extract VM size if specified, or check for forced VM family
    let vmSize = data.vmSize || data.size || data.sku;
    
    // Check for forced VM family preference
    const forcedFamily = data.forcedVMFamily || data.vmFamily || data.preferredVMFamily || data['VM Family'];
    if (forcedFamily && !vmSize) {
      console.log(`🎯 Server Selection - Forced VM family specified: ${forcedFamily}`);
      // Set a preferred size within that family based on CPU requirements
      const targetCPUs = requiredCPUs || 2; // Default to 2 CPUs if not specified
      
      switch (forcedFamily.toLowerCase()) {
        case 'dsv6':
        case 'd-series-v6':
        case 'dsv6-series':
          if (targetCPUs >= 8) vmSize = 'Standard_D8s_v6';
          else if (targetCPUs >= 4) vmSize = 'Standard_D4s_v6';
          else vmSize = 'Standard_D2s_v6';
          break;
        case 'ecadsv6':
        case 'ecads_v6':
        case 'ec-series-v6':
          if (targetCPUs >= 16) vmSize = 'Standard_EC16ads_v6';
          else if (targetCPUs >= 8) vmSize = 'Standard_EC8ads_v6';
          else if (targetCPUs >= 4) vmSize = 'Standard_EC4ads_v6';
          else vmSize = 'Standard_EC2ads_v6';
          break;
        case 'dsv5':
        case 'd-series-v5':
          if (targetCPUs >= 8) vmSize = 'Standard_D8s_v5';
          else if (targetCPUs >= 4) vmSize = 'Standard_D4s_v5';
          else vmSize = 'Standard_D2s_v5';
          break;
        case 'b-series':
        case 'burstable':
          if (targetCPUs >= 8) vmSize = 'Standard_B8ms';
          else if (targetCPUs >= 4) vmSize = 'Standard_B4ms';
          else vmSize = 'Standard_B2s';
          break;
        default:
          console.log(`⚠️  Unknown VM family: ${forcedFamily}, will use in selection logic`);
      }
      
      if (vmSize) {
        console.log(`🎯 Server Selection - Selected ${vmSize} for ${targetCPUs} CPUs in ${forcedFamily} family`);
      }
    }

    // Extract hostname/server name
    console.log('🔍 Server Selection - Extracting hostname from data fields...');
    
    // Try various common hostname field names (case-insensitive)
    const possibleHostnameFields = [
      'hostname', 'Hostname', 'HOSTNAME',
      'serverName', 'ServerName', 'server_name', 'Server Name', 'SERVER_NAME',
      'serverHostname', 'ServerHostname', 'server_hostname', 'Server Hostname', 'SERVER_HOSTNAME',
      'name', 'Name', 'NAME',
      'server', 'Server', 'SERVER',
      'computername', 'ComputerName', 'Computer Name', 'COMPUTER_NAME',
      'computer', 'Computer', 'COMPUTER',
      'host', 'Host', 'HOST',
      'machine', 'Machine', 'MACHINE',
      'system', 'System', 'SYSTEM',
      'node', 'Node', 'NODE',
      'device', 'Device', 'DEVICE',
      'asset', 'Asset', 'ASSET',
      'vm', 'VM', 'vm_name', 'VM Name', 'VM_NAME'
    ];
    
    let hostname = null;
    
    // Try to find hostname in the data using exact field name matches
    for (const field of possibleHostnameFields) {
      if (data[field] && String(data[field]).trim() !== '') {
        hostname = String(data[field]).trim();
        console.log(`✅ Server Selection - Found hostname "${hostname}" in field "${field}"`);
        break;
      }
    }
    
    // If no exact match, try case-insensitive field name matching
    if (!hostname) {
      const dataKeys = Object.keys(data);
      
      for (const possibleField of possibleHostnameFields) {
        const matchingKey = dataKeys.find(key => 
          key.toLowerCase().trim() === possibleField.toLowerCase().trim()
        );
        
        if (matchingKey && data[matchingKey] && String(data[matchingKey]).trim() !== '') {
          hostname = String(data[matchingKey]).trim();
          console.log(`✅ Server Selection - Found hostname "${hostname}" in field "${matchingKey}"`);
          break;
        }
      }
    }
    
    // If still no hostname found, look for fields that contain server-like names
    if (!hostname) {
      const dataEntries = Object.entries(data);
      
      for (const [key, value] of dataEntries) {
        if (value && typeof value === 'string' && value.trim() !== '') {
          const trimmedValue = value.trim();
          
          // Check if the value looks like a hostname/server name
          // Pattern: starts with letter/number, contains letters/numbers/dots/hyphens, at least 3 chars
          if (/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(trimmedValue) && trimmedValue.length >= 3) {
            // Additional checks to avoid false positives
            const lowerValue = trimmedValue.toLowerCase();
            
            // Skip values that look like regions, OS names, or other non-hostname data
            const skipPatterns = [
              /^(east|west|north|south|central)/,
              /^(windows|linux|ubuntu|centos|redhat)/,
              /^\d+(\.\d+)?$/,  // Pure numbers
              /^(gb|mb|tb|hours?|days?)$/,  // Units
              /^(development|testing|production|dev|test|prod)$/,  // Environment names
              /^(high|medium|low)$/,  // Priority/confidence levels
              /^\d+\.\d+\.\d+\.\d+$/,  // IP addresses
              /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i  // UUIDs
            ];
            
            const shouldSkip = skipPatterns.some(pattern => pattern.test(lowerValue));
            
            if (!shouldSkip) {
              hostname = trimmedValue;
              console.log(`✅ Server Selection - Found potential hostname "${hostname}" in field "${key}"`);
              break;
            }
          }
        }
      }
    }
    
    // Final fallback - generate a hostname based on available data or use a generic one
    if (!hostname) {
      // Try to create a meaningful hostname from other fields
      const region = String(data.region || data.location || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
      const os = String(data.os || 'server').toLowerCase().replace(/[^a-z0-9]/g, '');
      hostname = `${region}-${os}-${Math.random().toString(36).substr(2, 6)}`;
      console.log(`⚠️  Server Selection - No hostname found, generated: "${hostname}"`);
    }

    const result = {
      region,
      os: osDetection.os,
      hoursToRun,
      vmSize: vmSize ? String(vmSize).trim() : undefined,
      hostname: String(hostname).trim(),
      forcedFamily: forcedFamily ? String(forcedFamily).toLowerCase() : undefined,
      requiredCPUs,
      requiredRAM
    };
    
    console.log(`🔍 Server Selection - Parsed input result:`, { 
      hostname: result.hostname, 
      forcedFamily: result.forcedFamily, 
      vmSize: result.vmSize,
      requiredCPUs: result.requiredCPUs,
      requiredRAM: result.requiredRAM
    });
    
    return result;
  }

  /**
   * Detect OS from various data fields
   */
  private detectOSFromData(data: any): OSDetectionResult {
    // Check common OS field names
    const osFields = [
      data.os, 
      data.operatingSystem, 
      data['Operating System'], 
      data['Operating System Version'],
      data.platform,
      data.osType
    ];

    for (const field of osFields) {
      if (field) {
        const detected = detectOSType(String(field));
        if (detected) {
          return {
            os: detected,
            confidence: 0.9,
            detectedFrom: String(field)
          };
        }
      }
    }

    // Default to Linux (more cost-effective)
    return {
      os: 'linux',
      confidence: 0.1,
      detectedFrom: 'default'
    };
  }

  /**
   * Parse hours from various formats
   */
  private parseHours(hoursInput: any): number {
    if (typeof hoursInput === 'number') {
      return Math.max(1, hoursInput);
    }
    
    const parsed = parseFloat(String(hoursInput).replace(/[^\d.]/g, ''));
    return isNaN(parsed) ? 24 : Math.max(1, parsed); // Default to 24 hours, minimum 1
  }

  /**
   * Select the best VM from available options
   * Prioritizes latest D family (Dsv6 series) first, considering CPU and RAM requirements
   */
  private selectBestVM(vmPrices: AzureRetailPrice[], preferredSize?: string, forcedFamily?: string, requiredCPUs?: number, requiredRAM?: number): AzureRetailPrice | null {
    if (vmPrices.length === 0) return null;

    console.log(`🔍 Server Selection - Analyzing ${vmPrices.length} available VMs`);
    if (forcedFamily) {
      console.log(`🎯 Server Selection - Forced VM family: ${forcedFamily}`);
    }
    if (requiredCPUs) {
      console.log(`🎯 Server Selection - Required CPUs: ${requiredCPUs}`);
    }
    if (requiredRAM) {
      console.log(`🎯 Server Selection - Required RAM: ${requiredRAM} GB`);
    }

    // Filter VMs based on CPU and RAM requirements
    const filterVMsByRequirements = (vms: AzureRetailPrice[]): AzureRetailPrice[] => {
      if (!requiredCPUs && !requiredRAM) return vms;
      
      return vms.filter(vm => {
        const vmName = vm.armSkuName || vm.skuName || '';
        const vmSpecs = this.extractVMSpecs(vmName);
        
        const meetsCPURequirement = !requiredCPUs || vmSpecs.cpu >= requiredCPUs;
        const meetsRAMRequirement = !requiredRAM || vmSpecs.ram >= requiredRAM;
        
        const meetsRequirements = meetsCPURequirement && meetsRAMRequirement;
        
        if (!meetsRequirements) {
          console.log(`🚫 Server Selection - ${vmName} excluded: has ${vmSpecs.cpu} CPUs/${vmSpecs.ram} GB RAM, needs ${requiredCPUs || 'any'} CPUs/${requiredRAM || 'any'} GB RAM`);
        } else {
          console.log(`✅ Server Selection - ${vmName} meets requirements: has ${vmSpecs.cpu} CPUs/${vmSpecs.ram} GB RAM`);
        }
        
        return meetsRequirements;
      });
    };

    // If a specific size is requested, try to find it
    if (preferredSize) {
      console.log(`🎯 Server Selection - Looking for preferred size: ${preferredSize}`);
      const exactMatch = vmPrices.find(vm => 
        vm.armSkuName?.toLowerCase().includes(preferredSize.toLowerCase()) ||
        vm.skuName?.toLowerCase().includes(preferredSize.toLowerCase())
      );
      if (exactMatch) {
        // Check if preferred size meets requirements
        const vmSpecs = this.extractVMSpecs(exactMatch.armSkuName || exactMatch.skuName || '');
        const meetsCPU = !requiredCPUs || vmSpecs.cpu >= requiredCPUs;
        const meetsRAM = !requiredRAM || vmSpecs.ram >= requiredRAM;
        
        if (meetsCPU && meetsRAM) {
          console.log(`✅ Server Selection - Found exact match: ${exactMatch.armSkuName || exactMatch.skuName} at $${exactMatch.unitPrice}/hour`);
          return exactMatch;
        } else {
          console.log(`⚠️  Server Selection - Preferred size ${preferredSize} doesn't meet requirements (${vmSpecs.cpu} CPUs/${vmSpecs.ram} GB RAM), continuing search`);
        }
      }
    }

    // Handle forced family selection
    if (forcedFamily) {
      let familyVMs: AzureRetailPrice[] = [];
      
      switch (forcedFamily.toLowerCase()) {
        case 'dsv6':
        case 'd-series-v6':
        case 'dsv6-series':
          familyVMs = vmPrices.filter(vm => 
            (vm.armSkuName?.includes('_D') && vm.armSkuName?.includes('s_v6')) ||
            (vm.skuName?.includes('_D') && vm.skuName?.includes('s_v6'))
          );
          console.log(`🔍 Server Selection - Found ${familyVMs.length} Dsv6 VMs:`, familyVMs.slice(0, 3).map(vm => vm.armSkuName || vm.skuName));
          break;
        case 'dsv5':
        case 'd-series-v5':
          familyVMs = vmPrices.filter(vm => 
            (vm.armSkuName?.includes('_D') && vm.armSkuName?.includes('s_v5')) ||
            (vm.skuName?.includes('_D') && vm.skuName?.includes('s_v5'))
          );
          break;
        case 'ecadsv6':
        case 'ecads_v6':
        case 'ec-series-v6':
          familyVMs = vmPrices.filter(vm => 
            (vm.armSkuName?.includes('_EC') && vm.armSkuName?.includes('ads_v6')) ||
            (vm.skuName?.includes('_EC') && vm.skuName?.includes('ads_v6'))
          );
          console.log(`🔍 Server Selection - Found ${familyVMs.length} ECads_v6 VMs:`, familyVMs.slice(0, 3).map(vm => vm.armSkuName || vm.skuName));
          break;
        case 'b-series':
        case 'burstable':
          familyVMs = vmPrices.filter(vm => 
            vm.armSkuName?.includes('_B') || vm.skuName?.includes('_B')
          );
          break;
        default:
          console.log(`⚠️  Server Selection - Unknown forced family: ${forcedFamily}, using normal selection`);
      }
      
      // Filter family VMs by requirements
      const filteredFamilyVMs = filterVMsByRequirements(familyVMs);
      
      if (filteredFamilyVMs.length > 0) {
        const sortedFamilyVMs = filteredFamilyVMs.sort((a, b) => a.unitPrice - b.unitPrice);
        const selected = sortedFamilyVMs[0];
        console.log(`🎯 Server Selection - Forced family selection: ${selected.armSkuName || selected.skuName} at $${selected.unitPrice}/hour`);
        return selected;
      } else {
        console.log(`❌ Server Selection - No VMs found in forced family ${forcedFamily} that meet requirements, using fallback`);
        
        // For Dsv6, try to find the best alternative VMs
        if (forcedFamily.toLowerCase() === 'dsv6') {
          console.log(`🔄 Server Selection - Dsv6 not available with requirements, looking for alternative v6 generation VMs...`);
          
          // Try ECads_v6 first (AMD-based v6 generation VMs available for Linux)
          const ecadsV6VMs = vmPrices.filter(vm => 
            (vm.armSkuName?.includes('_EC') && vm.armSkuName?.includes('ads_v6')) ||
            (vm.skuName?.includes('_EC') && vm.skuName?.includes('ads_v6'))
          );
          
          const filteredEcadsV6VMs = filterVMsByRequirements(ecadsV6VMs);
          if (filteredEcadsV6VMs.length > 0) {
            const selected = filteredEcadsV6VMs.sort((a, b) => a.unitPrice - b.unitPrice)[0];
            console.log(`🔄 Server Selection - Using ECads_v6 alternative (AMD v6): ${selected.armSkuName || selected.skuName} at $${selected.unitPrice}/hour`);
            return selected;
          }
          
          // Try Dsv5 next
          const dsv5VMs = vmPrices.filter(vm => 
            (vm.armSkuName?.includes('_D') && vm.armSkuName?.includes('s_v5')) ||
            (vm.skuName?.includes('_D') && vm.skuName?.includes('s_v5'))
          );
          
          const filteredDsv5VMs = filterVMsByRequirements(dsv5VMs);
          if (filteredDsv5VMs.length > 0) {
            const selected = filteredDsv5VMs.sort((a, b) => a.unitPrice - b.unitPrice)[0];
            console.log(`🔄 Server Selection - Using Dsv5 alternative: ${selected.armSkuName || selected.skuName} at $${selected.unitPrice}/hour`);
            return selected;
          }
          
          // Try any D-series as fallback
          const anyDVMs = vmPrices.filter(vm => 
            (vm.armSkuName?.includes('_D') && vm.armSkuName?.includes('_v')) ||
            (vm.skuName?.includes('_D') && vm.skuName?.includes('_v'))
          );
          
          const filteredAnyDVMs = filterVMsByRequirements(anyDVMs);
          if (filteredAnyDVMs.length > 0) {
            const selected = filteredAnyDVMs.sort((a, b) => a.unitPrice - b.unitPrice)[0];
            console.log(`🔄 Server Selection - Using D-series fallback: ${selected.armSkuName || selected.skuName} at $${selected.unitPrice}/hour`);
            return selected;
          }
          
          console.log(`⚠️  Server Selection - No D-series VMs available that meet requirements, continuing with standard selection`);
        }
      }
    }

    // Priority 1: Latest D family (Dsv6 series)
    const dsv6VMs = vmPrices.filter(vm => 
      (vm.armSkuName?.includes('_D') && vm.armSkuName?.includes('s_v6')) ||
      (vm.skuName?.includes('_D') && vm.skuName?.includes('s_v6'))
    );

    const filteredDsv6VMs = filterVMsByRequirements(dsv6VMs);
    if (filteredDsv6VMs.length > 0) {
      const sortedDsv6 = filteredDsv6VMs.sort((a, b) => a.unitPrice - b.unitPrice);
      const selected = sortedDsv6[0];
      console.log(`⭐ Server Selection - Dsv6 series: ${selected.armSkuName || selected.skuName} at $${selected.unitPrice}/hour`);
      return selected;
    }

    // Priority 1.5: ECads_v6 series (AMD-based v6 generation, available for Linux)
    const ecadsV6VMs = vmPrices.filter(vm => 
      (vm.armSkuName?.includes('_EC') && vm.armSkuName?.includes('ads_v6')) ||
      (vm.skuName?.includes('_EC') && vm.skuName?.includes('ads_v6'))
    );

    const filteredEcadsV6VMs = filterVMsByRequirements(ecadsV6VMs);
    if (filteredEcadsV6VMs.length > 0) {
      const sortedEcadsV6 = filteredEcadsV6VMs.sort((a, b) => a.unitPrice - b.unitPrice);
      const selected = sortedEcadsV6[0];
      console.log(`⭐ Server Selection - ECads_v6 series (AMD v6): ${selected.armSkuName || selected.skuName} at $${selected.unitPrice}/hour`);
      return selected;
    }

    // Priority 2: Other D family versions (v5, v4, v3)
    const dFamilyVMs = vmPrices.filter(vm => {
      const skuName = vm.armSkuName || vm.skuName || '';
      return (
        DEFAULT_VM_SIZES.general.some(size => skuName.includes(size)) || 
        (skuName.includes('_D') && (skuName.includes('_v5') || skuName.includes('_v4') || skuName.includes('_v3')))
      );
    });

    const filteredDFamilyVMs = filterVMsByRequirements(dFamilyVMs);
    if (filteredDFamilyVMs.length > 0) {
      const sortedDFamily = filteredDFamilyVMs.sort((a, b) => {
        const aVersion = this.extractVMVersion(a.armSkuName || a.skuName || '');
        const bVersion = this.extractVMVersion(b.armSkuName || b.skuName || '');
        
        // Higher version first, then lower price
        if (aVersion !== bVersion) {
          return bVersion - aVersion;
        }
        return a.unitPrice - b.unitPrice;
      });
      
      const selected = sortedDFamily[0];
      console.log(`💰 Server Selection - D family: ${selected.armSkuName || selected.skuName} at $${selected.unitPrice}/hour`);
      return selected;
    }

    // Priority 3: General purpose VMs (B series, etc.)
    const generalPurposeVMs = vmPrices.filter(vm => 
      DEFAULT_VM_SIZES.general.some(size => 
        (vm.armSkuName?.includes(size) || vm.skuName?.includes(size))
      )
    );

    const filteredGeneralPurposeVMs = filterVMsByRequirements(generalPurposeVMs);
    if (filteredGeneralPurposeVMs.length > 0) {
      const sortedVMs = filteredGeneralPurposeVMs.sort((a, b) => a.unitPrice - b.unitPrice);
      const selected = sortedVMs[0];
      console.log(`💰 Server Selection - General purpose: ${selected.armSkuName || selected.skuName} at $${selected.unitPrice}/hour`);
      return selected;
    }

    // Priority 4: Fallback with specialized VM filtering
    const specializedSeries = ['DC', 'NC', 'ND', 'NV', 'HB', 'HC', 'M'];
    const filteredVMs = vmPrices.filter(vm => {
      const skuName = vm.armSkuName || vm.skuName || '';
      const series = skuName.split('_')[1]?.slice(0, 2) || '';
      
      // If a specific VM size was requested and it's specialized, allow it
      if (preferredSize && skuName.toLowerCase().includes(preferredSize.toLowerCase())) {
        return true;
      }
      
      // Otherwise, exclude specialized series
      const isSpecialized = specializedSeries.some(spec => series.startsWith(spec));
      if (isSpecialized) {
        console.log(`🚫 Server Selection - Excluding specialized VM: ${skuName} (${series} series)`);
        return false;
      }
      
      return true;
    });

    // Apply requirements filtering to fallback VMs
    const finalFilteredVMs = filterVMsByRequirements(filteredVMs);
    
    // Use filtered VMs if available, otherwise fall back to all VMs that meet requirements
    let vmsToUse = finalFilteredVMs;
    if (finalFilteredVMs.length === 0) {
      console.log(`⚠️  Server Selection - No standard VMs meet requirements, trying all VMs`);
      vmsToUse = filterVMsByRequirements(vmPrices);
      
      if (vmsToUse.length === 0) {
        console.log(`❌ Server Selection - No VMs meet requirements, falling back to cheapest available`);
        vmsToUse = vmPrices;
      }
    }

    // Fallback: return the cheapest available VM
    const sortedAllVMs = vmsToUse.sort((a, b) => a.unitPrice - b.unitPrice);
    const fallbackSelected = sortedAllVMs[0];
    
    console.log(`🔄 Server Selection - Fallback: ${fallbackSelected.armSkuName || fallbackSelected.skuName} at $${fallbackSelected.unitPrice}/hour`);
    
    return fallbackSelected;
  }

  /**
   * Extract VM version number from VM name (e.g., v6, v5, v4, v3)
   */
  private extractVMVersion(vmName: string): number {
    const match = vmName.match(/_v(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Fallback pricing when API is unavailable
   */
  private getFallbackVMPricing(input: VMCalculationInput): VMCalculationResult {
    // Estimated pricing based on common VM sizes (as of 2024)
    const fallbackRates = {
      windows: {
        'Standard_B2s': 0.0496,
        'Standard_D2s_v3': 0.096,
        'default': 0.096
      },
      linux: {
        'Standard_B2s': 0.0208,
        'Standard_D2s_v3': 0.044,
        'default': 0.044
      }
    };

    const vmSize = input.vmSize || 'Standard_B2s';
    const rates = fallbackRates[input.os];
    const hourlyRate = rates[vmSize as keyof typeof rates] || rates.default;
    const totalCost = hourlyRate * input.hoursToRun;
    
    // Extract VM specs for fallback
    const vmSpecs = this.extractVMSpecs(vmSize);

    return {
      cost: totalCost,
      details: {
        vmSize,
        hourlyRate,
        totalHours: input.hoursToRun,
        osType: input.os,
        region: input.region,
        skuName: `${vmSize} (estimated)`,
        productName: `Virtual Machines ${vmSize} Series (estimated)`,
        currency: 'USD',
        // Use input requirements as the displayed specs (minimum requirements)
        cpu: input.requiredCPUs || vmSpecs.cpu,
        ram: input.requiredRAM || vmSpecs.ram,
        // Store Azure VM actual specs separately for reference
        azureVMCpu: vmSpecs.cpu,
        azureVMRam: vmSpecs.ram,
        unitOfMeasure: '1 Hour',
        hostname: input.hostname
      }
    };
  }

  /**
   * Get available VM sizes for a region (cached)
   */
  async getAvailableVMSizes(region: string, os: 'windows' | 'linux'): Promise<string[]> {
    try {
      const normalizedRegion = normalizeRegion(region);
      const vmPrices = await azureClient.getVMPrices(normalizedRegion, os);
      
      return vmPrices
        .map(vm => vm.armSkuName || vm.skuName)
        .filter(Boolean)
        .filter((size, index, array) => array.indexOf(size) === index) // Remove duplicates
        .sort();
        
    } catch (error) {
      console.error('Failed to get available VM sizes:', error);
      return DEFAULT_VM_SIZES.general;
    }
  }

  /**
   * Extract VM specifications from VM name
   */
  private extractVMSpecs(vmName: string): { cpu: number; ram: number } {
    // Azure VM naming convention: Standard_<Family><Size>_<Version>
    // Examples: Standard_D2s_v3, Standard_B2s, Standard_E4s_v3
    
    // Common Azure VM specifications
    const vmSpecs: Record<string, { cpu: number; ram: number }> = {
      // B-series (Burstable)
      'Standard_B1s': { cpu: 1, ram: 1 },
      'Standard_B1ms': { cpu: 1, ram: 2 },
      'Standard_B2s': { cpu: 2, ram: 4 },
      'Standard_B2ms': { cpu: 2, ram: 8 },
      'Standard_B4ms': { cpu: 4, ram: 16 },
      'Standard_B8ms': { cpu: 8, ram: 32 },
      'Standard_B12ms': { cpu: 12, ram: 48 },
      'Standard_B16ms': { cpu: 16, ram: 64 },
      'Standard_B20ms': { cpu: 20, ram: 80 },
      
      // D-series v3 (General purpose)
      'Standard_D2s_v3': { cpu: 2, ram: 8 },
      'Standard_D4s_v3': { cpu: 4, ram: 16 },
      'Standard_D8s_v3': { cpu: 8, ram: 32 },
      'Standard_D16s_v3': { cpu: 16, ram: 64 },
      'Standard_D32s_v3': { cpu: 32, ram: 128 },
      'Standard_D48s_v3': { cpu: 48, ram: 192 },
      'Standard_D64s_v3': { cpu: 64, ram: 256 },
      
      // D-series v4
      'Standard_D2s_v4': { cpu: 2, ram: 8 },
      'Standard_D4s_v4': { cpu: 4, ram: 16 },
      'Standard_D8s_v4': { cpu: 8, ram: 32 },
      'Standard_D16s_v4': { cpu: 16, ram: 64 },
      'Standard_D32s_v4': { cpu: 32, ram: 128 },
      'Standard_D48s_v4': { cpu: 48, ram: 192 },
      'Standard_D64s_v4': { cpu: 64, ram: 256 },
      
      // D-series v5
      'Standard_D2s_v5': { cpu: 2, ram: 8 },
      'Standard_D4s_v5': { cpu: 4, ram: 16 },
      'Standard_D8s_v5': { cpu: 8, ram: 32 },
      'Standard_D16s_v5': { cpu: 16, ram: 64 },
      'Standard_D32s_v5': { cpu: 32, ram: 128 },
      'Standard_D48s_v5': { cpu: 48, ram: 192 },
      'Standard_D64s_v5': { cpu: 64, ram: 256 },
      'Standard_D96s_v5': { cpu: 96, ram: 384 },
      
      // D-series v6 (Latest generation)
      'Standard_D2s_v6': { cpu: 2, ram: 8 },
      'Standard_D4s_v6': { cpu: 4, ram: 16 },
      'Standard_D8s_v6': { cpu: 8, ram: 32 },
      'Standard_D16s_v6': { cpu: 16, ram: 64 },
      'Standard_D32s_v6': { cpu: 32, ram: 128 },
      'Standard_D48s_v6': { cpu: 48, ram: 192 },
      'Standard_D64s_v6': { cpu: 64, ram: 256 },
      'Standard_D96s_v6': { cpu: 96, ram: 384 },
      'Standard_D128s_v6': { cpu: 128, ram: 512 },
      
      // DC-series (Confidential compute)
      'Standard_DC1s_v3': { cpu: 1, ram: 8 },
      'Standard_DC2s_v3': { cpu: 2, ram: 16 },
      'Standard_DC4s_v3': { cpu: 4, ram: 32 },
      'Standard_DC8s_v3': { cpu: 8, ram: 64 },
      'Standard_DC16s_v3': { cpu: 16, ram: 128 },
      'Standard_DC32s_v3': { cpu: 32, ram: 256 },
      'Standard_DC48s_v3': { cpu: 48, ram: 384 },
      
      // E-series v3 (Memory optimized)
      'Standard_E2s_v3': { cpu: 2, ram: 16 },
      'Standard_E4s_v3': { cpu: 4, ram: 32 },
      'Standard_E8s_v3': { cpu: 8, ram: 64 },
      'Standard_E16s_v3': { cpu: 16, ram: 128 },
      'Standard_E32s_v3': { cpu: 32, ram: 256 },
      'Standard_E48s_v3': { cpu: 48, ram: 384 },
      'Standard_E64s_v3': { cpu: 64, ram: 432 },
      
      // F-series v2 (Compute optimized)
      'Standard_F2s_v2': { cpu: 2, ram: 4 },
      'Standard_F4s_v2': { cpu: 4, ram: 8 },
      'Standard_F8s_v2': { cpu: 8, ram: 16 },
      'Standard_F16s_v2': { cpu: 16, ram: 32 },
      'Standard_F32s_v2': { cpu: 32, ram: 64 },
      'Standard_F48s_v2': { cpu: 48, ram: 96 },
      'Standard_F64s_v2': { cpu: 64, ram: 128 },
      'Standard_F72s_v2': { cpu: 72, ram: 144 }
    };
    
    // First try exact match
    if (vmSpecs[vmName]) {
      return vmSpecs[vmName];
    }
    
    // Try to parse from the name pattern if exact match not found
    const match = vmName.match(/Standard_([A-Z]+)(\d+)([a-z]*)/i);
    if (match) {
      const family = match[1].toUpperCase();
      const size = parseInt(match[2], 10);
      const suffix = match[3];
      
      // Estimate based on family and size
      let ramMultiplier = 4; // Default ratio
      
      switch (family) {
        case 'B':
          ramMultiplier = size === 1 ? (suffix.includes('ms') ? 2 : 1) : 4;
          break;
        case 'D':
          ramMultiplier = 4;
          break;
        case 'E':
          ramMultiplier = 8; // Memory optimized
          break;
        case 'F':
          ramMultiplier = 2; // Compute optimized
          break;
        case 'DC':
          ramMultiplier = 8; // Confidential compute
          break;
      }
      
      return {
        cpu: size,
        ram: size * ramMultiplier
      };
    }
    
    // Fallback
    return { cpu: 2, ram: 8 };
  }
}

// Export singleton instance
export const vmCalculator = new VMCalculator(); 