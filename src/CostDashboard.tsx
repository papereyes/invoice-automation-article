import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './index.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function CostDashboard() {
  const [volume, setVolume] = useState<number>(500);

  const AI_COST_PER_INVOICE = 2.13 / 77; // roughly 0.02766
  const FIXED_VPS_COST = 6.00;

  // Calculate metrics for current volume
  const currentAiCost = volume * AI_COST_PER_INVOICE;
  const currentTotalCost = currentAiCost + FIXED_VPS_COST;
  const currentBlendedCost = currentTotalCost / volume;

  // Generate data for the chart
  const volumes = useMemo(() => {
    const arr = [];
    for (let i = 50; i <= 1000; i += 50) {
      arr.push(i);
    }
    return arr;
  }, []);

  const totalCostData = useMemo(() => {
    return volumes.map(v => (v * AI_COST_PER_INVOICE) + FIXED_VPS_COST);
  }, [volumes]);

  const aiCostData = useMemo(() => {
    return volumes.map(v => v * AI_COST_PER_INVOICE);
  }, [volumes]);

  // Create point styles to highlight the active point
  const pointRadiusTotal = volumes.map(v => v === volume ? 6 : 0);
  const pointBackgroundColorTotal = volumes.map(v => v === volume ? '#ef4444' : '#3b82f6');
  
  const pointRadiusAi = volumes.map(v => v === volume ? 6 : 0);
  const pointBackgroundColorAi = volumes.map(v => v === volume ? '#ef4444' : '#22c55e');

  const chartData = {
    labels: volumes,
    datasets: [
      {
        label: 'Total Monthly Cost ($)',
        data: totalCostData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: pointRadiusTotal,
        pointBackgroundColor: pointBackgroundColorTotal,
        pointBorderColor: pointBackgroundColorTotal,
        pointHoverRadius: 8,
      },
      {
        label: 'LLM Cost Only ($)',
        data: aiCostData,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.1,
        pointRadius: pointRadiusAi,
        pointBackgroundColor: pointBackgroundColorAi,
        pointBorderColor: pointBackgroundColorAi,
        pointHoverRadius: 8,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 40,
        ticks: {
          callback: function(value: any) {
            return '$' + value;
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Monthly Invoice Volume'
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  return (
    <div className="dashboard-mockup" style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>Platform Cost vs Invoice Volume</h3>
      </div>
      
      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.875rem 1rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>LLM cost per invoice</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>$0.028</div>
        </div>
        
        <div style={{ padding: '0.875rem 1rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>VPS Fixed Cost</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>$6.00<span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>/mo</span></div>
        </div>
        
        <div style={{ padding: '0.875rem 1rem', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '0.7rem', color: '#2563eb', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Total This Month</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d4ed8' }}>${currentTotalCost.toFixed(2)}</div>
        </div>
        
        <div style={{ padding: '0.875rem 1rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '0.7rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Blended per Invoice</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#15803d' }}>${currentBlendedCost.toFixed(2)}</div>
        </div>
      </div>
      
      {/* Slider Control */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f9fafb', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="volume-slider" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#4b5563' }}>
            Adjust Monthly Volume
          </label>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', background: '#ffffff', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
            {volume} invoices
          </div>
        </div>
        <div style={{ padding: '0.25rem 0' }}>
          <input 
            id="volume-slider"
            type="range" 
            min="50" 
            max="1000" 
            step="50" 
            value={volume} 
            onChange={(e) => setVolume(parseInt(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6', height: '4px' }}
          />
        </div>
      </div>
      
      {/* Chart */}
      <div style={{ height: '240px', width: '100%', position: 'relative' }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
