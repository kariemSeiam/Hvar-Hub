import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3,
    Clock,
    CheckCircle,
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    Users,
    Package,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Filter,
    TestTube
} from 'lucide-react';
import { serviceActionAPI } from '../../api/serviceActionAPI';
import { debug } from '../../config/environment';
import UnifiedWorkflowTest from '../testing/UnifiedWorkflowTest';

/**
 * Workflow Dashboard Component
 * Provides comprehensive overview of service actions workflow and statistics
 */
const WorkflowDashboard = ({ className = '' }) => {
    // Dashboard data
    const [statistics, setStatistics] = useState({});
    const [integrationStatus, setIntegrationStatus] = useState({});
    const [recentActions, setRecentActions] = useState([]);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter states
    const [timeRange, setTimeRange] = useState('week'); // week, month, quarter
    const [statusFilter, setStatusFilter] = useState('all');

    // Testing states
    const [showTesting, setShowTesting] = useState(false);

    // Load dashboard data
    const loadDashboardData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            // Load all dashboard data in parallel
            const [statsResult, integrationResult, actionsResult] = await Promise.all([
                serviceActionAPI.getWorkflowStatistics(),
                serviceActionAPI.getIntegrationStatus(),
                serviceActionAPI.listServiceActions({
                    page: 1,
                    limit: 10,
                    sort: '-created_at'
                })
            ]);

            if (statsResult.success) {
                setStatistics(statsResult.data);
            }

            if (integrationResult.success) {
                setIntegrationStatus(integrationResult.data);
            }

            if (actionsResult.success) {
                setRecentActions(actionsResult.data.actions || []);
            }

            debug.log('Dashboard data loaded', {
                statistics: statsResult.success,
                integration: integrationResult.success,
                actions: actionsResult.success
            });

        } catch (error) {
            debug.error('Failed to load dashboard data', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            loadDashboardData(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [loadDashboardData]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        loadDashboardData(true);
    }, [loadDashboardData]);

    if (loading) {
        return (
            <div className={`${className}`}>
                <DashboardSkeleton />
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-right">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        لوحة تحكم سير العمل
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        نظرة شاملة على إجراءات الخدمة والتكامل مع نظام الصيانة
                    </p>
                </div>

                <div className="flex items-center space-x-3 space-x-reverse">
                    {/* Time Range Filter */}
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="arabic-input py-2 px-3 text-sm"
                    >
                        <option value="week">الأسبوع الماضي</option>
                        <option value="month">الشهر الماضي</option>
                        <option value="quarter">الربع الماضي</option>
                    </select>

                    {/* Testing Button */}
                    <button
                        onClick={() => setShowTesting(!showTesting)}
                        className={`arabic-button-secondary p-2 ${showTesting ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : ''}`}
                        title="اختبار سير العمل"
                    >
                        <TestTube className="w-4 h-4" />
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="arabic-button-secondary p-2"
                        title="تحديث البيانات"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="إجمالي إجراءات الخدمة"
                    value={statistics.total_actions || 0}
                    change={statistics.total_change || 0}
                    icon={Package}
                    color="blue"
                />

                <MetricCard
                    title="في انتظار الاستلام"
                    value={statistics.pending_receive || 0}
                    change={statistics.pending_change || 0}
                    icon={Clock}
                    color="amber"
                />

                <MetricCard
                    title="مكتملة"
                    value={statistics.completed || 0}
                    change={statistics.completed_change || 0}
                    icon={CheckCircle}
                    color="green"
                />

                <MetricCard
                    title="فاشلة"
                    value={statistics.failed || 0}
                    change={statistics.failed_change || 0}
                    icon={AlertTriangle}
                    color="red"
                />
            </div>

            {/* Workflow Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WorkflowStatusChart statistics={statistics} />
                <IntegrationStatusPanel integrationStatus={integrationStatus} />
            </div>

            {/* Integration Ready Actions */}
            {integrationStatus.ready_for_maintenance_hub?.length > 0 && (
                <IntegrationReadySection
                    actions={integrationStatus.ready_for_maintenance_hub}
                    onRefresh={handleRefresh}
                />
            )}

            {/* Recent Actions */}
            <RecentActionsSection
                actions={recentActions}
                onRefresh={handleRefresh}
            />

            {/* Performance Insights */}
            <PerformanceInsights statistics={statistics} />

            {/* Testing Section */}
            {showTesting && (
                <UnifiedWorkflowTest className="mt-6" />
            )}
        </div>
    );
};

// Metric Card Component
const MetricCard = ({ title, value, change, icon: Icon, color }) => {
    const isPositive = change >= 0;
    const colorClasses = {
        blue: 'text-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-900/20',
        amber: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
        green: 'text-green-500 bg-green-50 dark:bg-green-900/20',
        red: 'text-red-500 bg-red-50 dark:bg-red-900/20'
    };

    return (
        <div className="arabic-card p-6">
            <div className="flex items-center justify-between">
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {value.toLocaleString()}
                    </p>
                    {change !== 0 && (
                        <div className={`flex items-center mt-2 text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                            <span>{Math.abs(change)}</span>
                            {isPositive ? (
                                <ArrowUpRight className="w-4 h-4 mr-1" />
                            ) : (
                                <ArrowDownRight className="w-4 h-4 mr-1" />
                            )}
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
};

// Workflow Status Chart Component
const WorkflowStatusChart = ({ statistics }) => {
    const statusData = [
        { name: 'تم الإنشاء', value: statistics.created || 0, color: 'bg-gray-400' },
        { name: 'تم التأكيد', value: statistics.confirmed || 0, color: 'bg-blue-500' },
        { name: 'في انتظار الاستلام', value: statistics.pending_receive || 0, color: 'bg-amber-500' },
        { name: 'مكتمل', value: statistics.completed || 0, color: 'bg-green-500' },
        { name: 'فاشل', value: statistics.failed || 0, color: 'bg-red-500' }
    ];

    const total = statusData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="arabic-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                توزيع حالات سير العمل
            </h3>

            {total > 0 ? (
                <div className="space-y-4">
                    {statusData.map((item) => {
                        const percentage = total > 0 ? (item.value / total) * 100 : 0;

                        return (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex-1 text-right">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {item.name}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {item.value}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${item.color}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    لا توجد بيانات متاحة
                </div>
            )}
        </div>
    );
};

// Integration Status Panel Component
const IntegrationStatusPanel = ({ integrationStatus }) => {
    const integrationData = [
        {
            label: 'جاهز للتكامل',
            value: integrationStatus.pending_integration_count || 0,
            icon: Clock,
            color: 'text-amber-500'
        },
        {
            label: 'متكامل مع الصيانة',
            value: integrationStatus.integrated_count || 0,
            icon: CheckCircle,
            color: 'text-green-500'
        },
        {
            label: 'معدل نجاح التكامل',
            value: `${integrationStatus.integration_success_rate || 0}%`,
            icon: TrendingUp,
            color: 'text-blue-500'
        }
    ];

    return (
        <div className="arabic-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                حالة التكامل مع نظام الصيانة
            </h3>

            <div className="space-y-4">
                {integrationData.map((item, index) => {
                    const IconComponent = item.icon;

                    return (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 space-x-reverse">
                                <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-800`}>
                                    <IconComponent className={`w-5 h-5 ${item.color}`} />
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {item.label}
                                    </p>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {item.value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Integration Ready Section Component
const IntegrationReadySection = ({ actions, onRefresh }) => {
    return (
        <div className="arabic-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right">
                    إجراءات جاهزة للتكامل مع نظام الصيانة ({actions.length})
                </h3>
                <button
                    onClick={onRefresh}
                    className="arabic-button-secondary text-sm"
                >
                    تحديث
                </button>
            </div>

            <div className="space-y-3">
                {actions.slice(0, 5).map((action) => (
                    <div
                        key={action.id}
                        className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                    >
                        <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">
                                {serviceActionAPI.getActionTypeArabic(action.action_type)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                العميل: {action.customer_display_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                رقم التتبع: {action.original_tracking}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
                                جاهز للاستلام
                            </span>
                            <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                    </div>
                ))}

                {actions.length > 5 && (
                    <div className="text-center pt-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            و {actions.length - 5} إجراءات أخرى...
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Recent Actions Section Component
const RecentActionsSection = ({ actions, onRefresh }) => {
    return (
        <div className="arabic-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-right">
                    أحدث إجراءات الخدمة
                </h3>
                <button
                    onClick={onRefresh}
                    className="arabic-button-secondary text-sm"
                >
                    عرض الكل
                </button>
            </div>

            <div className="space-y-3">
                {actions.length > 0 ? actions.map((action) => (
                    <div
                        key={action.id}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">
                                {serviceActionAPI.getActionTypeArabic(action.action_type)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                العميل: {action.customer_display_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                                {new Date(action.created_at).toLocaleDateString('ar-EG')}
                            </p>
                        </div>
                        <div className="text-left">
                            <span className={`text-xs px-2 py-1 rounded ${{
                                'created': 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
                                'confirmed': 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
                                'pending_receive': 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
                                'completed': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
                                'failed': 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                            }[action.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                                {serviceActionAPI.getStatusArabic(action.status)}
                            </span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        لا توجد إجراءات خدمة حديثة
                    </div>
                )}
            </div>
        </div>
    );
};

// Performance Insights Component
const PerformanceInsights = ({ statistics }) => {
    const insights = [
        {
            title: 'متوسط وقت المعالجة',
            value: `${statistics.avg_processing_time || 0} يوم`,
            trend: statistics.processing_time_trend || 0,
            icon: Clock
        },
        {
            title: 'معدل نجاح الإجراءات',
            value: `${statistics.success_rate || 0}%`,
            trend: statistics.success_rate_trend || 0,
            icon: TrendingUp
        },
        {
            title: 'عدد العملاء النشطين',
            value: statistics.active_customers || 0,
            trend: statistics.customer_trend || 0,
            icon: Users
        }
    ];

    return (
        <div className="arabic-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                رؤى الأداء
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {insights.map((insight, index) => {
                    const IconComponent = insight.icon;
                    const isPositive = insight.trend >= 0;

                    return (
                        <div key={index} className="text-center">
                            <div className="flex items-center justify-center mb-2">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <IconComponent className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                </div>
                            </div>

                            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                {insight.title}
                            </h4>

                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {insight.value}
                            </p>

                            {insight.trend !== 0 && (
                                <div className={`flex items-center justify-center mt-1 text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    <span>{Math.abs(insight.trend)}%</span>
                                    {isPositive ? (
                                        <ArrowUpRight className="w-4 h-4 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="w-4 h-4 mr-1" />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Loading Skeleton Component
const DashboardSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="text-right">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
            </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="arabic-card p-6">
                    <div className="flex items-center justify-between">
                        <div className="text-right">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                        </div>
                        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                    </div>
                </div>
            ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="arabic-card p-6">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, j) => (
                            <div key={j} className="flex items-center">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 ml-2"></div>
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default WorkflowDashboard;
