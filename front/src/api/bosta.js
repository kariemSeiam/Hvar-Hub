import axios from './axios';

// Bosta API Configuration
const BOSTA_BASE_URL = 'https://app.bosta.co/api/v2';
const BOSTA_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IkxDMDk1RFUzYVd6czhnOEpqTjM3UyIsInJvbGVzIjpbIkJVU0lORVNTX0FETUlOIl0sImJ1c2luZXNzQWRtaW5JbmZvIjp7ImJ1c2luZXNzSWQiOiJaMGZLbmVrUmQ3SXllaGhjN2hMRnoiLCJidXNpbmVzc05hbWUiOiJIVkFSIn0sImNvdW50cnkiOnsiX2lkIjoiNjBlNDQ4MmM3Y2I3ZDRiYzQ4NDljNGQ1IiwibmFtZSI6IkVneXB0IiwibmFtZUFyIjoi2YXYtdixIiwiY29kZSI6IkVHIn0sImVtYWlsIjoia2FyaWVtc2VpYW1AZ21haWwuY29tIiwicGhvbmUiOiIrMjAxMDMzOTM5ODI4IiwiZ3JvdXAiOnsiX2lkIjoiWGFxbENGQSIsIm5hbWUiOiJCVVNJTkVTU19GVUxMX0FDQ0VTUyIsImNvZGUiOjExNX0sInRva2VuVHlwZSI6IkFDQ0VTUyIsInRva2VuVmVyc2lvbiI6IlYyIiwic2Vzc2lvbklkIjoiMDFLMVIxRFpSUkRaNTI1UEUyNUczWDEySkgiLCJpYXQiOjE3NTQyMjcyMTIsImV4cCI6MTc1NTQzNjgxMn0.L3E4X84JcRr898L5gvC8IhxHckhQHpdR4W3qh6gba98';
// Create Bosta API instance
const bostaApi = axios.create({
  baseURL: BOSTA_BASE_URL,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ar',
    'Authorization': `Bearer ${BOSTA_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Device-Fingerprint': 'ibb5ip',
    'X-Device-Id': '01JY2223AMT7XM37D6MXYQME5Y',
    'Origin': 'https://app.bosta.co',
    'Referer': 'https://app.bosta.co/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  // CORS settings
  withCredentials: false,
  timeout: 10000
});

// API Functions
export const bostaAPI = {
  /**
   * Get delivery details by tracking number
   * @param {string} trackingNumber - The tracking number
   * @returns {Promise} Promise object with delivery data
   */
  async getDeliveryByTrackingNumber(trackingNumber) {
    try {
      const response = await bostaApi.get(`/deliveries/business/${trackingNumber}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'تم جلب البيانات بنجاح'
      };
    } catch (error) {
      console.error('Error fetching delivery:', error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'فشل في جلب البيانات',
        error: error.response?.status || 'NETWORK_ERROR'
      };
    }
  },

  /**
   * Get multiple deliveries by tracking numbers
   * @param {string[]} trackingNumbers - Array of tracking numbers
   * @returns {Promise} Promise object with deliveries data
   */
  async getMultipleDeliveries(trackingNumbers) {
    try {
      const promises = trackingNumbers.map(trackingNumber => 
        this.getDeliveryByTrackingNumber(trackingNumber)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successfulDeliveries = results
        .filter(result => result.status === 'fulfilled' && result.value.success)
        .map(result => result.value.data);
      
      const failedDeliveries = results
        .filter(result => result.status === 'rejected' || !result.value.success)
        .map((result, index) => ({
          trackingNumber: trackingNumbers[index],
          error: result.reason || result.value.message
        }));

      return {
        success: true,
        data: {
          successful: successfulDeliveries,
          failed: failedDeliveries,
          total: trackingNumbers.length,
          successCount: successfulDeliveries.length,
          failureCount: failedDeliveries.length
        },
        message: `تم جلب ${successfulDeliveries.length} من ${trackingNumbers.length} طلب`
      };
    } catch (error) {
      console.error('Error fetching multiple deliveries:', error);
      return {
        success: false,
        data: null,
        message: 'فشل في جلب البيانات',
        error: 'BATCH_FETCH_ERROR'
      };
    }
  },

  /**
   * Transform Bosta data to match our internal order structure
   * @param {Object} bostaData - Raw Bosta API data
   * @returns {Object} Transformed order data
   */
  transformBostaOrder(bostaData) {
    if (!bostaData) return null;

    return {
      // Basic order info
      _id: bostaData._id,
      trackingNumber: bostaData.trackingNumber,
      status: this.mapBostaStatusToInternal(bostaData.maskedState || bostaData.state?.value),
      
      // Receiver info
      receiver: {
        fullName: bostaData.receiver?.fullName || '',
        phone: bostaData.receiver?.phone || '',
        secondPhone: bostaData.receiver?.secondPhone || ''
      },
      
      // Address info
      address: bostaData.dropOffAddress ? 
        `${bostaData.dropOffAddress.firstLine || ''} ${bostaData.dropOffAddress.secondLine || ''} - ${bostaData.dropOffAddress.zone?.nameAr || ''}, ${bostaData.dropOffAddress.city?.nameAr || ''}`.trim() :
        '',
      
      // Financial info
      cod: bostaData.cod || 0,
      
      // Specs
      specs: {
        weight: bostaData.specs?.weight || 0,
        packageDetails: {
          itemsCount: bostaData.specs?.packageDetails?.itemsCount || 
                     bostaData.returnSpecs?.packageDetails?.itemsCount || 1,
          description: bostaData.returnSpecs?.packageDetails?.description || 
                      bostaData.specs?.packageDetails?.description || 'لا يوجد وصف'
        }
      },
      
      // Type
      type: {
        value: bostaData.type?.value || 'غير محدد'
      },
      
      // Dates
      createdAt: bostaData.createdAt || bostaData.creationTimestamp,
      updatedAt: bostaData.updatedAt,
      
      // Timeline
      timeline: bostaData.timeline || [],
      
      // Maintenance history (empty for new orders)
      maintenanceHistory: [],
      
      // Bosta-specific data
      bostaData: {
        originalData: bostaData,
        shippingState: bostaData.maskedState || bostaData.state?.value,
        bostaFees: bostaData.wallet?.cashCycle?.bosta_fees || bostaData.shipmentFees || 0,
        starName: bostaData.star?.name || 'غير محدد',
        starPhone: bostaData.star?.phone || '',
        proofImages: bostaData.starProofOfReturnedPackages || [],
        returnReason: bostaData.returnSpecs?.packageDetails?.description || '',
        attemptsCount: bostaData.attemptsCount || 0,
        isReturned: bostaData.maskedState === 'Returned'
      }
    };
  },

  /**
   * Map Bosta status to our internal status
   * @param {string} bostaStatus - Bosta status
   * @returns {string} Internal status
   */
  mapBostaStatusToInternal(bostaStatus) {
    const statusMap = {
      'Delivered': 'completed',
      'Returned': 'returned',
      'In Transit': 'received',
      'Out for Delivery': 'received',
      'Picked Up': 'received',
      'Ready for Pickup': 'received'
    };
    
    return statusMap[bostaStatus] || 'received';
  }
};

export default bostaAPI; 