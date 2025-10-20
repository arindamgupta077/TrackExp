import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, RefreshCw } from 'lucide-react';
import { useCreditIncomeAnalytics } from '@/hooks/useCreditIncomeAnalytics';
import { formatCurrencyInIST } from '@/lib/dateUtils';
import { getIconByCategoryName } from '@/data/categoryIcons';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface CreditIncomeAnalyticsSectionProps {
  userId: string | undefined;
}

const CreditIncomeAnalyticsSection: React.FC<CreditIncomeAnalyticsSectionProps> = ({ userId }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'line'>('pie');

  const { data, loading, error, refetch } = useCreditIncomeAnalytics(
    userId,
    viewMode === 'monthly' && selectedMonth !== 'all' ? selectedMonth : undefined,
    selectedYear
  );

  // Generate year options (last 5 years + current year)
  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  // Generate month options
  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Chart colors
  const COLORS = [
    'var(--chart-indigo)',
    'var(--chart-green)',
    'var(--chart-gold)',
    'var(--chart-orange)',
    'var(--chart-purple)',
    'var(--chart-teal)',
    'var(--chart-rose)'
  ];

  // Prepare chart data
  const chartData = data?.categoryBreakdown.map((item, index) => ({
    name: item.category,
    credits: item.credits,
    income: item.income,
    total: item.total,
    fill: COLORS[index % COLORS.length],
  })) || [];

  const trendData = data?.monthlyTrend || [];

  // Calculate summary stats
  const totalCredits = data?.totalCredits || 0;
  const totalIncome = data?.totalIncome || 0;
  const totalAmount = totalCredits + totalIncome;

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Credit & Income Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Credit & Income Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            <p>Error loading analytics: {error}</p>
            <Button onClick={refetch} variant="outline" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Credit & Income Analytics
          </CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border">
              <Button
                variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('monthly')}
                className="rounded-r-none"
              >
                Monthly
              </Button>
              <Button
                variant={viewMode === 'yearly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('yearly')}
                className="rounded-l-none"
              >
                Yearly
              </Button>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex rounded-lg border border-border">
              <Button
                variant={chartType === 'pie' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('pie')}
                className="rounded-r-none"
              >
                <PieChart className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="rounded-l-none rounded-r-none"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="rounded-l-none"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {viewMode === 'monthly' && (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Credits</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrencyInIST(totalCredits)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrencyInIST(totalIncome)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Combined Total</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrencyInIST(totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="space-y-6">
            {chartType === 'pie' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
                
                {/* Top Row: Pie Chart (Left) + Summary & Insights (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Pie Chart Section - Left */}
                  <div className="flex justify-center items-center">
                    <ChartContainer
                      config={{
                        credits: { label: "Credits", color: 'var(--chart-indigo)' },
                        income: { label: "Income", color: 'var(--chart-green)' },
                        total: { label: "Total", color: 'var(--chart-gold)' },
                      }}
                      className="h-[500px] w-[500px]"
                    >
                      <RePieChart>
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="backdrop-blur-sm border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] rounded-lg p-3 shadow-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: data.fill }}
                                    />
                                    <span className="font-semibold">{data.name}</span>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span>Credits:</span>
                                      <span className="font-mono">{formatCurrencyInIST(data.credits)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Income:</span>
                                      <span className="font-mono">{formatCurrencyInIST(data.income)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold border-t pt-1">
                                      <span>Total:</span>
                                      <span className="font-mono">{formatCurrencyInIST(data.total)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>Percentage:</span>
                                      <span>{((data.total / totalAmount) * 100).toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={chartData}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={150}
                          innerRadius={50}
                          paddingAngle={3}
                          label={false}
                          stroke="color-mix(in srgb, hsl(var(--foreground)) 12%, transparent)"
                          strokeWidth={2}
                          startAngle={90}
                          endAngle={450}
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.fill}
                              stroke="color-mix(in srgb, hsl(var(--foreground)) 12%, transparent)"
                              strokeWidth={2}
                              style={{
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                                transition: 'all 0.2s ease-in-out'
                              }}
                            />
                          ))}
                        </Pie>
                        {/* Center Text */}
                        <text 
                          x="50%" 
                          y="45%" 
                          textAnchor="middle" 
                          dominantBaseline="middle" 
                          className="text-3xl font-bold fill-foreground"
                        >
                          Total
                        </text>
                        <text 
                          x="50%" 
                          y="55%" 
                          textAnchor="middle" 
                          dominantBaseline="middle" 
                          className="text-xl font-semibold fill-muted-foreground"
                        >
                          {formatCurrencyInIST(totalAmount)}
                        </text>
                      </RePieChart>
                    </ChartContainer>
                  </div>

                  {/* Summary & Insights Section - Right */}
                  <div className="space-y-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Summary & Insights
                    </h4>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:bg-blue-500/15 transition-colors">
                        <div className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Total Credits
                        </div>
                        <div className="font-semibold text-blue-600 font-mono">
                          {formatCurrencyInIST(totalCredits)}
                        </div>
                        <div className="text-xs text-blue-400/70 mt-1">
                          {totalAmount > 0 ? ((totalCredits / totalAmount) * 100).toFixed(1) : 0}% of total
                        </div>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 hover:bg-green-500/15 transition-colors">
                        <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Total Income
                        </div>
                        <div className="font-semibold text-green-600 font-mono">
                          {formatCurrencyInIST(totalIncome)}
                        </div>
                        <div className="text-xs text-green-400/70 mt-1">
                          {totalAmount > 0 ? ((totalIncome / totalAmount) * 100).toFixed(1) : 0}% of total
                        </div>
                      </div>
                    </div>

                    {/* Additional Insights */}
                    {chartData.length > 0 && (
                      <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
                        <div className="text-xs text-purple-400 mb-2 flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          Insights
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Categories:</span>
                            <span className="font-medium">{chartData.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Top Category:</span>
                            <span className="font-medium">{chartData[0]?.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Credit/Income Ratio:</span>
                            <span className="font-medium">
                              {totalIncome > 0 ? (totalCredits / totalIncome).toFixed(2) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {chartType === 'bar' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
                
                {/* Mobile Layout */}
                <div className="block md:hidden">
                  <div className="space-y-3">
                    {chartData.map((item, index) => {
                      const creditsPercentage = item.total > 0 ? (item.credits / item.total) * 100 : 0;
                      const incomePercentage = item.total > 0 ? (item.income / item.total) * 100 : 0;
                      const isTopCategory = index === 0;
                      
                      return (
                        <div 
                          key={index} 
                          className={`relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                            isTopCategory 
                              ? 'bg-gradient-to-r from-blue-500/10 to-green-500/10 border-blue-500/30 shadow-lg' 
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {/* Background gradient effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                          
                          <div className="relative p-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                                  isTopCategory 
                                    ? 'bg-blue-500/20 border-2 border-blue-500/30' 
                                    : 'bg-white/10 border border-white/20'
                                } transition-all duration-300`}>
                                  <span className="text-sm">{getIconByCategoryName(item.name)}</span>
                                  {isTopCategory && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                      <TrendingUp className="h-1.5 w-1.5 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm text-white">{item.name}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {totalAmount > 0 ? ((item.total / totalAmount) * 100).toFixed(1) : 0}% of total
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-white">
                                  {formatCurrencyInIST(item.total)}
                                </p>
                                <p className="text-xs text-muted-foreground">Total</p>
                              </div>
                            </div>
                            
                            {/* Enhanced Progress Bars */}
                            <div className="space-y-3">
                              {/* Credits Bar */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                    <span className="text-xs font-medium text-blue-400">Credits</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-mono font-semibold text-blue-400">
                                      {formatCurrencyInIST(item.credits)}
                                    </span>
                                    <span className="text-xs text-blue-400/70 ml-1">
                                      ({creditsPercentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out relative"
                                    style={{ width: `${creditsPercentage}%` }}
                                  >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                  </div>
                                  {/* Percentage indicator */}
                                  <div 
                                    className="absolute top-4 text-xs font-medium text-blue-400 transition-all duration-300"
                                    style={{ left: `${Math.min(creditsPercentage, 95)}%`, transform: 'translateX(-50%)' }}
                                  >
                                    {creditsPercentage.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                              
                              {/* Income Bar */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span className="text-xs font-medium text-green-400">Income</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-mono font-semibold text-green-400">
                                      {formatCurrencyInIST(item.income)}
                                    </span>
                                    <span className="text-xs text-green-400/70 ml-1">
                                      ({incomePercentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000 ease-out relative"
                                    style={{ width: `${incomePercentage}%` }}
                                  >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                  </div>
                                  {/* Percentage indicator */}
                                  <div 
                                    className="absolute top-4 text-xs font-medium text-green-400 transition-all duration-300"
                                    style={{ left: `${Math.min(incomePercentage, 95)}%`, transform: 'translateX(-50%)' }}
                                  >
                                    {incomePercentage.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Top category indicator */}
                            {isTopCategory && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex items-center gap-2 text-xs text-blue-400">
                                  <TrendingUp className="h-3 w-3" />
                                  <span className="font-medium">Top category this period</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:block">
                  <ChartContainer
                    config={{
                      credits: { label: "Credits", color: 'var(--chart-indigo)' },
                      income: { label: "Income", color: 'var(--chart-green)' },
                    }}
                    className="h-[400px]"
                  >
                    <ReBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="credits" fill="var(--chart-indigo)" name="Credits" />
                      <Bar dataKey="income" fill="var(--chart-green)" name="Income" />
                    </ReBarChart>
                  </ChartContainer>
                </div>
              </div>
            )}

            {chartType === 'line' && trendData.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Monthly Trend Analysis
                  </h3>
                  
                  {/* Trend Summary Cards */}
                  <div className="flex gap-3">
                    {(() => {
                      const firstMonth = trendData[0];
                      const lastMonth = trendData[trendData.length - 1];
                      const creditsGrowth = firstMonth && lastMonth ? 
                        ((lastMonth.credits - firstMonth.credits) / firstMonth.credits * 100) : 0;
                      const incomeGrowth = firstMonth && lastMonth ? 
                        ((lastMonth.income - firstMonth.income) / firstMonth.income * 100) : 0;
                      
                      return (
                        <>
                          <div className="text-center px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <div className="text-xs text-blue-400">Credits Growth</div>
                            <div className={`text-sm font-semibold ${creditsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {creditsGrowth >= 0 ? '+' : ''}{creditsGrowth.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-center px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
                            <div className="text-xs text-green-400">Income Growth</div>
                            <div className={`text-sm font-semibold ${incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {incomeGrowth >= 0 ? '+' : ''}{incomeGrowth.toFixed(1)}%
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Mobile Layout - Enhanced Vertical Timeline */}
                <div className="block md:hidden">
                  <div className="space-y-3">
                    {trendData.map((month, index) => {
                      const isLatest = index === trendData.length - 1;
                      const previousMonth = index > 0 ? trendData[index - 1] : null;
                      const creditsChange = previousMonth ? month.credits - previousMonth.credits : 0;
                      const incomeChange = previousMonth ? month.income - previousMonth.income : 0;
                      const totalChange = previousMonth ? month.total - previousMonth.total : 0;
                      
                      // Calculate relative percentages for progress bars
                      const maxCredits = Math.max(...trendData.map(m => m.credits));
                      const maxIncome = Math.max(...trendData.map(m => m.income));
                      const maxTotal = Math.max(...trendData.map(m => m.total));
                      
                      const creditsPercentage = (month.credits / maxCredits) * 100;
                      const incomePercentage = (month.income / maxIncome) * 100;
                      const totalPercentage = (month.total / maxTotal) * 100;
                      
                      return (
                        <div 
                          key={index} 
                          className={`relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                            isLatest 
                              ? 'bg-gradient-to-r from-blue-500/10 to-green-500/10 border-blue-500/30 shadow-lg' 
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {/* Background gradient effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Timeline connector */}
                          {index < trendData.length - 1 && (
                            <div className="absolute left-8 top-20 w-0.5 h-6 bg-gradient-to-b from-blue-500/50 to-green-500/50" />
                          )}
                          
                          <div className="relative p-4">
                            {/* Header with enhanced styling */}
                            <div className="flex items-center gap-4 mb-4">
                              <div className={`relative flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
                                isLatest 
                                  ? 'bg-gradient-to-r from-blue-500/20 to-green-500/20 border-2 border-blue-500/30' 
                                  : 'bg-white/10 border border-white/20'
                              } transition-all duration-300`}>
                                <span className="text-lg font-bold">
                                  {new Date(`${month.month} 1, ${month.year}`).toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                                {isLatest && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                                    <TrendingUp className="h-2 w-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-base text-white">
                                  {month.month} {month.year}
                                </h4>
                                {isLatest && (
                                  <span className="text-xs bg-gradient-to-r from-blue-500/20 to-green-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                                    Latest Month
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-white">
                                  {formatCurrencyInIST(month.total)}
                                </p>
                                <p className="text-xs text-muted-foreground">Total</p>
                              </div>
                            </div>
                            
                            {/* Enhanced Trend Bars */}
                            <div className="space-y-4 ml-2">
                              {/* Credits Trend */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" />
                                    <span className="text-sm font-medium text-blue-400">Credits</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-mono font-semibold text-blue-400">
                                      {formatCurrencyInIST(month.credits)}
                                    </span>
                                    {previousMonth && (
                                      <div className={`text-xs ${creditsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {creditsChange >= 0 ? '+' : ''}{formatCurrencyInIST(creditsChange)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out relative"
                                    style={{ width: `${creditsPercentage}%` }}
                                  >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                  </div>
                                  {/* Percentage indicator */}
                                  <div 
                                    className="absolute -top-6 text-xs font-medium text-blue-400 transition-all duration-300"
                                    style={{ left: `${Math.min(creditsPercentage, 95)}%`, transform: 'translateX(-50%)' }}
                                  >
                                    {creditsPercentage.toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                              
                              {/* Income Trend */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-400 rounded-full" />
                                    <span className="text-sm font-medium text-green-400">Income</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-mono font-semibold text-green-400">
                                      {formatCurrencyInIST(month.income)}
                                    </span>
                                    {previousMonth && (
                                      <div className={`text-xs ${incomeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {incomeChange >= 0 ? '+' : ''}{formatCurrencyInIST(incomeChange)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000 ease-out relative"
                                    style={{ width: `${incomePercentage}%` }}
                                  >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                  </div>
                                  {/* Percentage indicator */}
                                  <div 
                                    className="absolute -top-6 text-xs font-medium text-green-400 transition-all duration-300"
                                    style={{ left: `${Math.min(incomePercentage, 95)}%`, transform: 'translateX(-50%)' }}
                                  >
                                    {incomePercentage.toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                              
                              {/* Total Trend */}
                              <div className="border-t border-white/10 pt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full" />
                                    <span className="text-sm font-medium text-yellow-400">Total</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-mono font-bold text-white">
                                      {formatCurrencyInIST(month.total)}
                                    </span>
                                    {previousMonth && (
                                      <div className={`text-xs ${totalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {totalChange >= 0 ? '+' : ''}{formatCurrencyInIST(totalChange)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out relative"
                                    style={{ width: `${totalPercentage}%` }}
                                  >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                  </div>
                                  {/* Percentage indicator */}
                                  <div 
                                    className="absolute -top-6 text-xs font-medium text-yellow-400 transition-all duration-300"
                                    style={{ left: `${Math.min(totalPercentage, 95)}%`, transform: 'translateX(-50%)' }}
                                  >
                                    {totalPercentage.toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Month indicator for latest */}
                            {isLatest && (
                              <div className="mt-4 pt-3 border-t border-white/10">
                                <div className="flex items-center gap-2 text-sm text-blue-400">
                                  <TrendingUp className="h-4 w-4" />
                                  <span className="font-medium">Latest month performance</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:block">
                  {/* Enhanced Line Chart */}
                  <ChartContainer
                    config={{
                      credits: { label: "Credits", color: 'var(--chart-indigo)' },
                      income: { label: "Income", color: 'var(--chart-green)' },
                      total: { label: "Total", color: 'var(--chart-gold)' },
                    }}
                    className="h-[450px]"
                  >
                    <LineChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, hsl(var(--border)) 55%, transparent)" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'color-mix(in srgb, hsl(var(--border)) 55%, transparent)' }}
                        tickLine={{ stroke: 'color-mix(in srgb, hsl(var(--border)) 55%, transparent)' }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'color-mix(in srgb, hsl(var(--border)) 55%, transparent)' }}
                        tickLine={{ stroke: 'color-mix(in srgb, hsl(var(--border)) 55%, transparent)' }}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="backdrop-blur-sm border border-[color:var(--border-soft)] bg-[color:var(--surface-overlay)] rounded-lg p-4 shadow-lg min-w-[200px]">
                                <div className="font-semibold text-sm mb-3 border-b pb-2">
                                  {label} {payload[0]?.payload?.year}
                                </div>
                                <div className="space-y-2">
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: entry.color }}
                                        />
                                        <span className="text-sm font-medium">{entry.dataKey}</span>
                                      </div>
                                      <span className="text-sm font-mono font-semibold">
                                        {formatCurrencyInIST(entry.value as number)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="credits" 
                        stroke="var(--chart-indigo)" 
                        strokeWidth={3}
                        dot={{ fill: 'var(--chart-indigo)', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'var(--chart-indigo)', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="income" 
                        stroke="var(--chart-green)" 
                        strokeWidth={3}
                        dot={{ fill: 'var(--chart-green)', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'var(--chart-green)', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="var(--chart-gold)" 
                        strokeWidth={3}
                        dot={{ fill: 'var(--chart-gold)', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'var(--chart-gold)', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ChartContainer>

                  {/* Monthly Statistics Grid */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trendData.map((month, index) => {
                      const isLatest = index === trendData.length - 1;
                      const previousMonth = index > 0 ? trendData[index - 1] : null;
                      const creditsChange = previousMonth ? month.credits - previousMonth.credits : 0;
                      const incomeChange = previousMonth ? month.income - previousMonth.income : 0;
                      
                      return (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg border transition-all hover:scale-105 ${
                            isLatest 
                              ? 'bg-gradient-to-r from-blue-500/10 to-green-500/10 border-blue-500/30' 
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-sm">
                              {month.month} {month.year}
                            </h4>
                            {isLatest && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                Latest
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Credits:</span>
                              <div className="text-right">
                                <div className="font-semibold font-mono text-sm">
                                  {formatCurrencyInIST(month.credits)}
                                </div>
                                {previousMonth && (
                                  <div className={`text-xs ${creditsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {creditsChange >= 0 ? '+' : ''}{formatCurrencyInIST(creditsChange)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Income:</span>
                              <div className="text-right">
                                <div className="font-semibold font-mono text-sm">
                                  {formatCurrencyInIST(month.income)}
                                </div>
                                {previousMonth && (
                                  <div className={`text-xs ${incomeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {incomeChange >= 0 ? '+' : ''}{formatCurrencyInIST(incomeChange)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center border-t pt-2">
                              <span className="text-xs font-medium">Total:</span>
                              <div className="font-bold font-mono text-sm">
                                {formatCurrencyInIST(month.total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Breakdown Section - Hidden on Mobile */}
        {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
          <div className="mt-8 hidden md:block">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-500" />
              Category Breakdown
            </h3>
            <div className="space-y-4">
              {data.categoryBreakdown.map((item, index) => {
                const percentage = totalAmount > 0 ? (item.total / totalAmount) * 100 : 0;
                const isTopCategory = index === 0;
                const hasCredits = item.credits > 0;
                const hasIncome = item.income > 0;
                const fillColor = chartData[index]?.fill || 'var(--chart-purple)';
                
                return (
                  <div 
                    key={item.category}
                    className={`group relative overflow-hidden rounded-lg border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
                      isTopCategory 
                        ? 'border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-blue-500/5' 
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Background gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {/* Category icon with animated background */}
                          <div className={`relative flex items-center justify-center w-12 h-12 rounded-full ${
                            isTopCategory 
                              ? 'bg-purple-500/20 border-2 border-purple-500/30' 
                              : 'bg-white/10 border border-white/20'
                          } transition-all duration-300 group-hover:scale-110`}>
                            <span className="text-xl">{getIconByCategoryName(item.category)}</span>
                            {isTopCategory && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                                <TrendingUp className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors duration-300">
                              {item.category}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {percentage.toFixed(1)}% of total
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            {formatCurrencyInIST(item.total)}
                          </p>
                          <div className="flex gap-2 text-xs">
                            {hasCredits && (
                              <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                Credits: {formatCurrencyInIST(item.credits)}
                              </span>
                            )}
                            {hasIncome && (
                              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                Income: {formatCurrencyInIST(item.income)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Animated progress bar */}
                      <div className="relative">
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                            style={{ 
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${fillColor}, color-mix(in srgb, ${fillColor} 60%, transparent))`
                            }}
                          >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                          </div>
                        </div>
                        
                        {/* Percentage indicator on progress bar */}
                        <div 
                          className="absolute top-4 text-xs font-medium text-white/80 transition-all duration-300"
                          style={{ left: `${Math.min(percentage, 95)}%`, transform: 'translateX(-50%)' }}
                        >
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                      
                      {/* Additional insights for top categories */}
                      {isTopCategory && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex items-center gap-2 text-sm text-purple-400">
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-medium">Top category this period</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                  </div>
                );
              })}
              
              {/* Summary footer */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{formatCurrencyInIST(totalCredits)}</p>
                    <p className="text-sm text-muted-foreground">Total Credits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{formatCurrencyInIST(totalIncome)}</p>
                    <p className="text-sm text-muted-foreground">Total Income</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-400">{data.categoryBreakdown.length}</p>
                    <p className="text-sm text-muted-foreground">Categories</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-400">
                      {formatCurrencyInIST(data.categoryBreakdown.length > 0 ? totalAmount / data.categoryBreakdown.length : 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Avg per Category</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {(!data || data.categoryBreakdown.length === 0) && (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              No credits or income data found for the selected period.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditIncomeAnalyticsSection;
