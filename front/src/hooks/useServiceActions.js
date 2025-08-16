import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { serviceActionAPI } from '../api/serviceActionAPI';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/environment';

export const useServiceActions = (initialStatus = 'all') => {
  // State management
  const [serviceActions, setServiceActions] = useState([]);
  const [filteredActions, setFilteredActions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [highlightedActionId, setHighlightedActionId] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Load service actions on mount or status change
  useEffect(() => {
    loadServiceActions();
  }, []);

  // Filter actions based on active status
  useEffect(() => {
    if (activeStatus === 'all') {
      setFilteredActions(serviceActions);
    } else {
      setFilteredActions(serviceActions.filter(action => action.status === activeStatus));
    }
  }, [activeStatus, serviceActions]);

  // Load service actions from API
  const loadServiceActions = async () => {
    try {
      setIsLoading(true);
      const response = await serviceActionAPI.listServiceActions();
      if (response.success) {
        const actions = response.data?.actions || [];
        // Transform actions for consistency
        const transformedActions = actions.map(action => 
          serviceActionAPI.transformServiceAction(action)
        );
        setServiceActions(transformedActions);
      } else {
        toast.error(response.message || ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } catch (error) {
      console.error('Failed to load service actions:', error);
      toast.error(ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle status change
  const handleStatusChange = useCallback((status) => {
    setActiveStatus(status);
    setHighlightedActionId(null);
  }, []);

  // Handle service action operations
  const handleAction = useCallback(async (actionType, actionId, notes = '', trackingNumber = '') => {
    if (actionInProgress) return;

    setActionInProgress(actionId);
    setHighlightedActionId(actionId);

    try {
      let response;

      switch (actionType) {
        case 'confirm':
          response = await serviceActionAPI.confirmServiceAction(actionId, trackingNumber, notes);
          break;
        case 'pending_receive':
          response = await serviceActionAPI.moveToPendingReceive(actionId, notes);
          break;
        case 'receive':
          response = await serviceActionAPI.completeServiceAction(actionId, notes);
          break;
        case 'complete':
          response = await serviceActionAPI.completeServiceAction(actionId, notes);
          break;
        case 'fail':
          response = await serviceActionAPI.failServiceAction(actionId, notes);
          break;
        case 'retry':
          // For retry, we update the status back to created
          response = await serviceActionAPI.updateServiceAction(actionId, { 
            status: 'created', 
            notes: `إعادة محاولة: ${notes}` 
          });
          break;
        case 'reactivate':
          // For reactivate, we update the status back to created
          response = await serviceActionAPI.updateServiceAction(actionId, { 
            status: 'created', 
            notes: `إعادة تفعيل: ${notes}` 
          });
          break;
        case 'view':
          // View action doesn't require API call
          return;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      if (response.success) {
        toast.success(response.message || SUCCESS_MESSAGES.ORDER_UPDATED);
        
        // Update local state with transformed data
        setServiceActions(prev => 
          prev.map(a => 
            a.id === actionId 
              ? serviceActionAPI.transformServiceAction({ ...a, ...response.data })
              : a
          )
        );

        // Force re-render
        setForceUpdate(prev => prev + 1);

        // Show success highlight briefly
        setTimeout(() => {
          setHighlightedActionId(null);
        }, 2000);
      } else {
        toast.error(response.message || ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error(ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setActionInProgress(null);
    }
  }, [actionInProgress]);

  // Create new service action
  const createServiceAction = useCallback(async (formData) => {
    try {
      const response = await serviceActionAPI.createServiceAction(formData);
      if (response.success) {
        toast.success(response.message || SUCCESS_MESSAGES.ORDER_CREATED);
        
        // Add to local state immediately with transformation
        const newAction = serviceActionAPI.transformServiceAction(response.data);
        setServiceActions(prev => [newAction, ...prev]);
        setForceUpdate(prev => prev + 1);
        
        // Optionally reload to ensure sync
        setTimeout(() => loadServiceActions(), 1000);
        
        return { success: true, data: newAction };
      } else {
        toast.error(response.message || ERROR_MESSAGES.UNKNOWN_ERROR);
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Failed to create service action:', error);
      toast.error(ERROR_MESSAGES.NETWORK_ERROR);
      return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
    }
  }, []);

  // Update existing service action
  const updateServiceAction = useCallback(async (actionId, formData) => {
    try {
      const response = await serviceActionAPI.updateServiceAction(actionId, formData);
      if (response.success) {
        toast.success(response.message || SUCCESS_MESSAGES.ORDER_UPDATED);
        
        // Update local state with transformation
        setServiceActions(prev => 
          prev.map(a => 
            a.id === actionId 
              ? serviceActionAPI.transformServiceAction({ ...a, ...response.data })
              : a
          )
        );
        setForceUpdate(prev => prev + 1);
        
        return { success: true, data: response.data };
      } else {
        toast.error(response.message || ERROR_MESSAGES.UNKNOWN_ERROR);
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Failed to update service action:', error);
      toast.error(ERROR_MESSAGES.NETWORK_ERROR);
      return { success: false, message: ERROR_MESSAGES.NETWORK_ERROR };
    }
  }, []);

  // Calculate status counts
  const getStatusCounts = useCallback(() => {
    const counts = {};
    serviceActions.forEach(action => {
      counts[action.status] = (counts[action.status] || 0) + 1;
    });
    return counts;
  }, [serviceActions]);

  // Get pending receive actions count for integration
  const getPendingReceiveCount = useCallback(() => {
    return serviceActions.filter(action => action.status === 'pending_receive').length;
  }, [serviceActions]);

  // Refresh data
  const refresh = useCallback(() => {
    serviceActionAPI.clearCache();
    setForceUpdate(prev => prev + 1);
    loadServiceActions();
  }, []);

  // Search service actions
  const searchServiceActions = useCallback(async (query) => {
    try {
      const response = await serviceActionAPI.listServiceActions({ search: query, limit: 100 });
      if (response.success) {
        const actions = response.data?.actions || [];
        const transformedActions = actions.map(action => 
          serviceActionAPI.transformServiceAction(action)
        );
        return { success: true, data: transformedActions };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error('Search failed:', error);
      return { success: false, data: [] };
    }
  }, []);

  return {
    // State
    serviceActions,
    filteredActions,
    isLoading,
    activeStatus,
    actionInProgress,
    highlightedActionId,
    forceUpdate,
    
    // Actions
    handleStatusChange,
    handleAction,
    createServiceAction,
    updateServiceAction,
    refresh,
    searchServiceActions,
    
    // Computed values
    getStatusCounts,
    getPendingReceiveCount,
    
    // Utilities
    setHighlightedActionId,
    setActionInProgress
  };
};
