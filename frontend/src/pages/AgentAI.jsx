import React, { useState } from 'react';
import {
  MdAutoAwesome, MdRefresh, MdWarning, MdCheckCircle,
  MdPhone, MdEmail, MdGavel, MdVisibility, MdBuild,
  MdPsychology, MdFlashOn
} from 'react-icons/md';
import api from '../api/axios';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const ACTION_META = {
  call:     { icon: <MdPhone />,      color: '#3b82f6', bg: '#eff6ff', label: 'Phone Call' },
  email:    { icon: <MdEmail />,      color: '#8b5cf6', bg: '#f5f3ff', label: 'Email' },
  legal:    { icon: <MdGavel />,      color: '#dc2626', bg: '#fef2f2', label: 'Legal Notice' },
  escalate: { icon: <MdWarning />,    color: '#ea580c', bg: '#fff7ed', label: 'Escalate' },
  monitor:  { icon: <MdVisibility />, color: '#16a34a', bg: '#f0fdf4', label: 'Monitor' },
};

const URGENCY_META = {
  immediate:   { label: 'Immediate',   color: '#dc2626', bg: '#fef2f2' },
  within_24h:  { label: 'Within 24h', color: '#ea580c', bg: '#fff7ed' },
  within_week: { label: 'This Week',  color: '#d97706', bg: '#fefce8' },
};

const AgentAI = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }]);

  const runAgent = async () => {
    setLoading(true);
    setPlan(null);
    setLog([]);
    addLog('🤖 Starting Claude agentic analysis...');
    addLog('📋 Fetching unpaid invoices from database...');
    try {
      addLog('🔧 Claude is calling tools: get_invoice_details, assess_risk, get_customer_history...');
      const res = await api.get('/api/predictions/agent/collection-plan');
      addLog(`✅ Agent completed in ${res.data.agent_iterations || 0} reasoning iterations`);
      addLog(`📊 Mode: ${res.data.agent_mode === 'claude_tool_use' ? 'Claude Tool-Use (Agentic)' : 'Rule-based fallback'}`);
      addLog(`🎯 ${res.data.actions?.length || 0} actions planned, ${res.data.escalated_invoices?.length || 0} escalated`);
      setPlan(res.data);
      toast.success('🤖 Agent analysis complete!');
    } catch (e) {
      addLog('❌ Agent error: ' + (e.response?.data?.detail || e.message));
      toast.error('Agent failed to run');
    } finally {
      setLoading(false);
    }
  };

  const agentModeIsReal = plan?.agent_mode === 'claude_tool_use';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🤖 Agentic AI — Collection Planner</h1>
          <p>Claude autonomously uses tools to analyze invoices, assess risk, and plan collections</p>
        </div>
        <button className="btn btn-primary" onClick={runAgent} disabled={loading}>
          {loading
            ? <><MdRefresh className="spin" /> Agent Running...</>
            : <><MdPsychology /> Run Agent</>}
        </button>
      </div>

      {/* How it works */}
      {!plan && !loading && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <h3 style={{ marginBottom: 4, color: 'var(--primary)' }}>True Agentic AI — How It Works</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Unlike a simple chatbot, this agent uses Claude's <strong>tool-use API</strong> in a reasoning loop.
              Claude decides which tools to call, observes results, and keeps going until every invoice is analyzed.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
              {[
                { icon: '🔍', title: 'Calls get_invoice_details', desc: 'Fetches live invoice data for each unpaid invoice' },
                { icon: '👤', title: 'Calls get_customer_history', desc: 'Checks late payment rate, credit score, outstanding balance' },
                { icon: '⚖️', title: 'Calls assess_risk', desc: 'Runs risk scoring model — returns LOW / MEDIUM / HIGH' },
                { icon: '📋', title: 'Calls recommend_action', desc: 'Records email / call / legal / escalate for each invoice' },
                { icon: '🚨', title: 'Calls flag_for_escalation', desc: 'Flags critical invoices (30+ days overdue, HIGH risk)' },
                { icon: '🔁', title: 'Iterates autonomously', desc: 'Loops until all invoices are processed — no human guidance needed' },
              ].map((item, i) => (
                <div key={i} style={{ padding: 14, background: 'var(--bg)', borderRadius: 10, borderLeft: '3px solid var(--primary)' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button className="btn btn-primary btn-lg" onClick={runAgent}>
                <MdPsychology /> Run Agentic AI Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live agent log */}
      {(loading || log.length > 0) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3><MdBuild style={{ verticalAlign: 'middle', marginRight: 6 }} />Agent Activity Log</h3>
            {loading && <span className="badge badge-info">● Live</span>}
          </div>
          <div style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, background: '#0f172a', borderRadius: '0 0 10px 10px', maxHeight: 180, overflowY: 'auto' }}>
            {log.map((entry, i) => (
              <div key={i} style={{ color: '#94a3b8', marginBottom: 4 }}>
                <span style={{ color: '#475569', marginRight: 10 }}>{entry.time}</span>
                <span style={{ color: '#e2e8f0' }}>{entry.msg}</span>
              </div>
            ))}
            {loading && <div style={{ color: '#3b82f6' }}>▌ thinking...</div>}
          </div>
        </div>
      )}

      {/* Results */}
      {plan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Mode badge */}
          <div style={{
            padding: '12px 20px', borderRadius: 10,
            background: agentModeIsReal ? '#f0fdf4' : '#fefce8',
            border: `1px solid ${agentModeIsReal ? '#86efac' : '#fde047'}`,
            display: 'flex', alignItems: 'center', gap: 12, fontSize: 13
          }}>
            {agentModeIsReal
              ? <><MdFlashOn style={{ color: '#16a34a', fontSize: 20 }} /><span><strong style={{ color: '#15803d' }}>Claude Tool-Use Agent Active</strong> — Claude called real tools in a reasoning loop ({plan.agent_iterations} iterations)</span></>
              : <><MdWarning style={{ color: '#ca8a04', fontSize: 20 }} /><span><strong style={{ color: '#854d0e' }}>Rule-based Fallback</strong> — Set ANTHROPIC_API_KEY in .env to enable the true agentic mode</span></>
            }
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Invoices Analyzed', value: plan.total_invoices_analyzed, color: 'var(--primary)' },
              { label: 'Actions Planned', value: plan.actions?.length || 0, color: '#8b5cf6' },
              { label: 'Immediate Actions', value: plan.actions?.filter(a => a.urgency === 'immediate').length || 0, color: '#dc2626' },
              { label: 'Escalated', value: plan.escalated_invoices?.length || 0, color: '#ea580c' },
              { label: 'Agent Iterations', value: plan.agent_iterations || '—', color: '#0891b2' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Agent reasoning */}
          <div className="card">
            <div className="card-header">
              <h3>🧠 Agent Summary &amp; Reasoning</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Generated {new Date(plan.generated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <div className="card-body">
              <div style={{ padding: '14px 18px', background: '#eff6ff', borderRadius: 10, marginBottom: 12, borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>📊 Executive Summary</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#1e3a5f' }}>{plan.summary}</div>
              </div>
              <div style={{ padding: '14px 18px', background: 'var(--bg)', borderRadius: 10, borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontWeight: 700, color: '#6d28d9', marginBottom: 4 }}>🤖 Agent Reasoning</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>{plan.agent_reasoning}</div>
              </div>

              {plan.escalated_invoices?.length > 0 && (
                <div style={{ marginTop: 12, padding: '12px 16px', background: '#fef2f2', borderRadius: 10, borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>🚨 Flagged for Immediate Escalation</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {plan.escalated_invoices.map(inv => (
                      <span key={inv} style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{inv}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action plan */}
          <div className="card">
            <div className="card-header">
              <h3>📋 Prioritized Action Plan</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{plan.actions?.length} actions · sorted by urgency</span>
            </div>
            <div style={{ padding: '0 0 8px' }}>
              {(plan.actions || []).map((action, idx) => {
                const am = ACTION_META[action.action_type] || ACTION_META['monitor'];
                const um = URGENCY_META[action.urgency] || URGENCY_META['within_week'];
                return (
                  <div key={idx} style={{
                    display: 'flex', gap: 16, padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: idx % 2 === 0 ? 'transparent' : 'var(--bg)',
                  }}>
                    <div style={{
                      minWidth: 36, height: 36, borderRadius: '50%',
                      background: idx < 3 ? '#fef2f2' : 'var(--bg)',
                      color: idx < 3 ? '#dc2626' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, flexShrink: 0
                    }}>#{action.priority}</div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700 }}>{action.invoice_number}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{action.customer_name}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: am.bg, color: am.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                          {am.icon} {am.label}
                        </span>
                        <span style={{ background: um.bg, color: um.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                          ⏱ {um.label}
                        </span>
                        {action.escalation_reason && (
                          <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                            🚨 ESCALATED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4, lineHeight: 1.5 }}>
                        <strong>Action:</strong> {action.action_detail}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <MdCheckCircle style={{ verticalAlign: 'middle', color: '#16a34a', marginRight: 4 }} />
                        <strong>Expected:</strong> {action.expected_outcome}
                      </div>
                      {action.escalation_reason && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c', background: '#fef2f2', padding: '4px 10px', borderRadius: 6 }}>
                          ⚠️ Escalation reason: {action.escalation_reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!plan.actions || plan.actions.length === 0) && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <MdCheckCircle style={{ fontSize: 48, color: '#16a34a', display: 'block', margin: '0 auto 12px' }} />
                  <strong>No actions needed!</strong> All invoices are on track.
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-outline" onClick={runAgent} disabled={loading}>
              <MdRefresh /> Re-run Agent Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentAI;
