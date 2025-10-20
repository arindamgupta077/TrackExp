import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart3, LineChart, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { MonthlyRemainingBalance } from '@/hooks/useMonthlyRemainingBalances';
import { formatCurrencyInIST } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart as ReBarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';

interface MonthlyRemainingBalancesChartProps {
  data: MonthlyRemainingBalance[];
  year: number;
  loading?: boolean;
}

type ChartType = 'bar' | 'line' | 'pie';
type ViewType = 'monthly' | 'category';

const MonthlyRemainingBalancesChart: React.FC<MonthlyRemainingBalancesChartProps> = ({
  data,
  year,
  loading = false
}) => {
  const isMobile = useIsMobile();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(year);

  // Update selectedYear when prop year changes
  useEffect(() => {
    setSelectedYear(year);
  }, [year]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ] as const;

  // Colors for different chart elements
  const CHART_COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
    '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
  ];

  // Prepare monthly trend data (showing total remaining balance for each month)
  const monthlyTrendData = useMemo(() => {
    const currentMonth = new Date().getMonth(); // 0-based (0 = January, 11 = December)
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthKey = monthKeys[index];
      const totalRemaining = data.reduce((sum, category) => {
        return sum + (category[monthKey] || 0);
      }, 0);
      
      return {
        month,
        monthShort: month.substring(0, 3),
        totalRemaining,
        positiveBalance: Math.max(0, totalRemaining),
        negativeBalance: Math.min(0, totalRemaining),
        monthIndex: index
      };
    }).filter(monthData => {
      // Only show data for current and past months
      // If viewing current year, filter by current month
      // If viewing past years, show all months
      if (selectedYear === currentYear) {
        return monthData.monthIndex <= currentMonth;
      } else if (selectedYear < currentYear) {
        return true; // Show all months for past years
      } else {
        return false; // Don't show any months for future years
      }
    });
  }, [data, selectedYear]);

  // Prepare category comparison data
  const categoryComparisonData = useMemo(() => {
    const currentMonth = new Date().getMonth(); // 0-based (0 = January, 11 = December)
    const currentYear = new Date().getFullYear();
    
    if (selectedCategory === 'all') {
      return data.map((category, index) => {
        const totalYearBalance = monthKeys.reduce((sum, monthKey, monthIndex) => {
          // Only include months up to current month for current year
          if (selectedYear === currentYear && monthIndex > currentMonth) {
            return sum; // Skip future months
          } else if (selectedYear > currentYear) {
            return sum; // Skip all months for future years
          }
          return sum + (category[monthKey] || 0);
        }, 0);
        
        return {
          categoryName: category.category_name,
          totalBalance: totalYearBalance,
          fill: CHART_COLORS[index % CHART_COLORS.length]
        };
      }).sort((a, b) => Math.abs(b.totalBalance) - Math.abs(a.totalBalance));
    } else {
      // Show monthly breakdown for selected category
      const categoryData = data.find(cat => cat.category_name === selectedCategory);
      if (!categoryData) return [];
      
      return months.map((month, index) => {
        const monthKey = monthKeys[index];
        return {
          month,
          monthShort: month.substring(0, 3),
          balance: categoryData[monthKey] || 0,
          monthIndex: index
        };
      }).filter(monthData => {
        // Only show data for current and past months
        if (selectedYear === currentYear) {
          return monthData.monthIndex <= currentMonth;
        } else if (selectedYear < currentYear) {
          return true; // Show all months for past years
        } else {
          return false; // Don't show any months for future years
        }
      });
    }
  }, [data, selectedCategory, selectedYear]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const currentMonth = new Date().getMonth(); // 0-based (0 = January, 11 = December)
    const currentYear = new Date().getFullYear();
    
    const totalPositive = monthlyTrendData.reduce((sum, month) => sum + Math.max(0, month.totalRemaining), 0);
    const totalNegative = monthlyTrendData.reduce((sum, month) => sum + Math.min(0, month.totalRemaining), 0);
    const netBalance = totalPositive + totalNegative;
    
    const categoriesInProfit = data.filter(cat => {
      const totalBalance = monthKeys.reduce((sum, monthKey, monthIndex) => {
        // Only include months up to current month for current year
        if (selectedYear === currentYear && monthIndex > currentMonth) {
          return sum; // Skip future months
        } else if (selectedYear > currentYear) {
          return sum; // Skip all months for future years
        }
        return sum + (cat[monthKey] || 0);
      }, 0);
      return totalBalance > 0;
    }).length;
    
    const categoriesInLoss = data.filter(cat => {
      const totalBalance = monthKeys.reduce((sum, monthKey, monthIndex) => {
        // Only include months up to current month for current year
        if (selectedYear === currentYear && monthIndex > currentMonth) {
          return sum; // Skip future months
        } else if (selectedYear > currentYear) {
          return sum; // Skip all months for future years
        }
        return sum + (cat[monthKey] || 0);
      }, 0);
      return totalBalance < 0;
    }).length;

    return {
      totalPositive,
      totalNegative,
      netBalance,
      categoriesInProfit,
      categoriesInLoss,
      totalCategories: data.length
    };
  }, [data, monthlyTrendData, selectedYear]);

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data available for {year}
        </div>
      );
    }

    const chartData = viewType === 'monthly' ? monthlyTrendData : categoryComparisonData;

    switch (chartType) {
      case 'bar':
        return (
          <ChartContainer
            config={{
              totalRemaining: { label: "Total Remaining", color: "hsl(var(--primary))" },
              balance: { label: "Balance", color: "hsl(var(--primary))" },
              totalBalance: { label: "Total Balance", color: "hsl(var(--primary))" }
            }}
            className={isMobile ? "h-48" : "h-64"}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={chartData} margin={isMobile ? { top: 10, right: 20, left: 10, bottom: 5 } : { top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey={viewType === 'monthly' ? 'monthShort' : (selectedCategory === 'all' ? 'categoryName' : 'monthShort')}
                  stroke="rgba(255,255,255,0.7)"
                  fontSize={isMobile ? 10 : 12}
                  angle={viewType === 'category' && selectedCategory === 'all' ? -45 : 0}
                  textAnchor={viewType === 'category' && selectedCategory === 'all' ? 'end' : 'middle'}
                  height={isMobile ? (viewType === 'category' && selectedCategory === 'all' ? 60 : 40) : (viewType === 'category' && selectedCategory === 'all' ? 80 : 60)}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.7)"
                  fontSize={isMobile ? 10 : 12}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const value = payload[0].value as number;
                      return (
                        <div className="bg-gray-900 border border-white/20 rounded-lg p-3 shadow-lg">
                          <p className="text-white font-medium">{label}</p>
                          <p className={`text-sm ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Balance: ₹{formatCurrencyInIST(value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey={viewType === 'monthly' ? 'totalRemaining' : (selectedCategory === 'all' ? 'totalBalance' : 'balance')}
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case 'line':
        return (
          <ChartContainer
            config={{
              totalRemaining: { label: "Total Remaining", color: "hsl(var(--primary))" },
              balance: { label: "Balance", color: "hsl(var(--primary))" }
            }}
            className={isMobile ? "h-48" : "h-64"}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={chartData} margin={isMobile ? { top: 10, right: 20, left: 10, bottom: 5 } : { top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey={viewType === 'monthly' ? 'monthShort' : 'monthShort'}
                  stroke="rgba(255,255,255,0.7)"
                  fontSize={isMobile ? 10 : 12}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.7)"
                  fontSize={isMobile ? 10 : 12}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const value = payload[0].value as number;
                      return (
                        <div className="bg-gray-900 border border-white/20 rounded-lg p-3 shadow-lg">
                          <p className="text-white font-medium">{label}</p>
                          <p className={`text-sm ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Balance: ₹{formatCurrencyInIST(value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey={viewType === 'monthly' ? 'totalRemaining' : 'balance'}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case 'pie':
        if (viewType === 'monthly') {
          // For monthly view, show positive vs negative balance distribution
          const pieData = [
            { name: 'Positive Balance', value: Math.abs(summaryStats.totalPositive), fill: '#10b981' },
            { name: 'Negative Balance', value: Math.abs(summaryStats.totalNegative), fill: '#ef4444' }
          ].filter(item => item.value > 0);
          
          return (
            <ChartContainer
              config={{
                value: { label: "Amount", color: "hsl(var(--primary))" }
              }}
              className={isMobile ? "h-48" : "h-64"}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={isMobile ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-900 border border-white/20 rounded-lg p-3 shadow-lg">
                            <p className="text-white font-medium">{data.name}</p>
                            <p className="text-sm text-white/80">₹{formatCurrencyInIST(data.value)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </ChartContainer>
          );
        } else {
          // For category view, show category distribution
          const pieData = categoryComparisonData
            .filter(item => Math.abs(item.totalBalance) > 0)
            .slice(0, 10); // Show top 10 categories
          
          return (
            <ChartContainer
              config={{
                totalBalance: { label: "Total Balance", color: "hsl(var(--primary))" }
              }}
              className={isMobile ? "h-48" : "h-64"}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ categoryName, percent }) => `${categoryName}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={isMobile ? 60 : 80}
                    fill="#8884d8"
                    dataKey="totalBalance"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-900 border border-white/20 rounded-lg p-3 shadow-lg">
                            <p className="text-white font-medium">{data.categoryName}</p>
                            <p className={`text-sm ${data.totalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              Balance: ₹{formatCurrencyInIST(data.totalBalance)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </ChartContainer>
          );
        }

      default:
        return null;
    }
  };

  return (
    <Card className={`glass-card ${isMobile ? 'p-3' : 'p-4 md:p-6'}`}>
      <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
        <div className="flex items-center gap-2">
          <BarChart3 className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
          <h3 className={`font-heading font-semibold ${isMobile ? 'text-lg' : 'text-xl'}`}>Monthly Remaining Balances - Visual Analysis</h3>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className={`grid gap-3 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Net Balance</span>
          </div>
          <p className={`font-semibold ${summaryStats.netBalance >= 0 ? 'text-green-400' : 'text-red-400'} ${isMobile ? 'text-sm' : 'text-lg'}`}>
            ₹{formatCurrencyInIST(summaryStats.netBalance)}
          </p>
        </div>
        
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Positive Total</span>
          </div>
          <p className={`font-semibold text-green-400 ${isMobile ? 'text-sm' : 'text-lg'}`}>
            ₹{formatCurrencyInIST(summaryStats.totalPositive)}
          </p>
        </div>
        
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Negative Total</span>
          </div>
          <p className={`font-semibold text-red-400 ${isMobile ? 'text-sm' : 'text-lg'}`}>
            ₹{formatCurrencyInIST(Math.abs(summaryStats.totalNegative))}
          </p>
        </div>
        
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-4 w-4 text-primary" />
            <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Categories</span>
          </div>
          <p className={`font-semibold text-white ${isMobile ? 'text-sm' : 'text-lg'}`}>
            <span className="text-green-400">{summaryStats.categoriesInProfit}</span> / <span className="text-red-400">{summaryStats.categoriesInLoss}</span>
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className={`flex flex-col gap-4 mb-6 ${isMobile ? '' : 'md:flex-row'}`}>
        <div className={`flex items-center gap-2 ${isMobile ? 'flex-col items-start' : ''}`}>
          <Label className={`font-medium whitespace-nowrap ${isMobile ? 'text-sm mb-1' : 'text-sm'}`}>Year:</Label>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className={`bg-white/10 border-white/20 text-white ${isMobile ? 'w-full' : 'w-24'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20">
              {Array.from({ length: 6 }, (_, i) => {
                const yearOption = new Date().getFullYear() - i;
                return (
                  <SelectItem key={yearOption} value={yearOption.toString()} className="text-white hover:bg-white/10">
                    {yearOption}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className={`flex items-center gap-2 ${isMobile ? 'flex-col items-start' : ''}`}>
          <Label className={`font-medium whitespace-nowrap ${isMobile ? 'text-sm mb-1' : 'text-sm'}`}>View:</Label>
          <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
            <SelectTrigger className={`bg-white/10 border-white/20 text-white ${isMobile ? 'w-full' : 'w-32'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20">
              <SelectItem value="monthly" className="text-white hover:bg-white/10">Monthly Trend</SelectItem>
              <SelectItem value="category" className="text-white hover:bg-white/10">Category Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`flex items-center gap-2 ${isMobile ? 'flex-col items-start' : ''}`}>
          <Label className={`font-medium whitespace-nowrap ${isMobile ? 'text-sm mb-2' : 'text-sm'}`}>Chart Type:</Label>
          <div className="flex gap-1">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
              className={`${isMobile ? 'px-2 py-1 h-8 text-xs' : 'px-3 py-1 h-8'}`}
            >
              <BarChart3 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
              className={`${isMobile ? 'px-2 py-1 h-8 text-xs' : 'px-3 py-1 h-8'}`}
              disabled={viewType === 'category' && selectedCategory === 'all'}
            >
              <LineChart className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
            <Button
              variant={chartType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('pie')}
              className={`${isMobile ? 'px-2 py-1 h-8 text-xs' : 'px-3 py-1 h-8'}`}
            >
              <PieChart className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
          </div>
        </div>

        {viewType === 'category' && (
          <div className={`flex items-center gap-2 ${isMobile ? 'flex-col items-start' : ''}`}>
            <Label className={`font-medium whitespace-nowrap ${isMobile ? 'text-sm mb-1' : 'text-sm'}`}>Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className={`bg-white/10 border-white/20 text-white ${isMobile ? 'w-full' : 'w-48'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="all" className="text-white hover:bg-white/10">All Categories</SelectItem>
                {data.map((category) => (
                  <SelectItem 
                    key={category.category_name} 
                    value={category.category_name}
                    className="text-white hover:bg-white/10"
                  >
                    {category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="w-full">
        {renderChart()}
      </div>

      {/* Chart Description */}
      <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
        <p className="text-sm text-muted-foreground">
          {viewType === 'monthly' 
            ? `This chart shows the total remaining balance across all categories for each month in ${selectedYear}${selectedYear === new Date().getFullYear() ? ' (up to current month)' : ''}. Positive values indicate surplus budget, while negative values show overspending.`
            : selectedCategory === 'all'
            ? `This chart compares the total balance for each category in ${selectedYear}${selectedYear === new Date().getFullYear() ? ' (up to current month)' : ''}. Categories are sorted by absolute balance amount.`
            : `This chart shows the monthly balance trend for the ${selectedCategory} category in ${selectedYear}${selectedYear === new Date().getFullYear() ? ' (up to current month)' : ''}.`
          }
        </p>
      </div>
    </Card>
  );
};

export default MonthlyRemainingBalancesChart;
