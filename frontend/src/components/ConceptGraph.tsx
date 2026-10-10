import { useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "../services/api";
import { Loader2, Layers } from "lucide-react";
import type { GraphData, Status } from "../types/api";

// Custom styled Concept Node component adhering to design tokens
interface ConceptNodeData extends Record<string, unknown> {
  label: string;
  debt: number;
  status: Status;
  description: string;
  level: number;
  id: string;
}

function ConceptCustomNode({ data, selected }: NodeProps<Node<ConceptNodeData>>) {
  const isRoot = data.status === "root";
  const isTrace = data.status === "trace";
  const isFailed = data.status === "failed";
  const isAtRisk = data.status === "at_risk";

  let borderStyle = "border-[#35353B]";
  let bgStyle = "bg-[#1A1A1E]";
  let badgeColor = "text-[#9E9EA7]";

  if (isRoot) {
    borderStyle = "border-[#D00000] ring-2 ring-[#D00000]/30 shadow-lg shadow-[#D00000]/20";
    bgStyle = "bg-[#6A040F]";
    badgeColor = "text-[#F3F3F4]";
  } else if (isTrace) {
    borderStyle = "border-amber-500 ring-1 ring-amber-500/30";
    bgStyle = "bg-[#2A2312]";
    badgeColor = "text-amber-400";
  } else if (isFailed) {
    borderStyle = "border-rose-700";
    bgStyle = "bg-[#251719]";
    badgeColor = "text-rose-400";
  } else if (isAtRisk) {
    borderStyle = "border-amber-800/80";
    bgStyle = "bg-[#201C14]";
    badgeColor = "text-amber-300";
  }

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl border ${borderStyle} ${bgStyle} ${
        selected ? "ring-2 ring-white" : ""
      } min-w-[180px] max-w-[220px] transition-all text-left shadow-md`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[#D00000] !w-2 !h-2 !border-none" />

      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-[9px] font-mono tracking-wider uppercase text-[#9E9EA7]">
          LVL {data.level}
        </span>
        {data.debt >= 1 && (
          <span className={`text-[10px] font-mono font-bold ${badgeColor}`}>
            {Math.round(data.debt)}% debt
          </span>
        )}
      </div>

      <div className="font-display font-semibold text-xs text-[#F3F3F4] leading-tight">
        {data.label}
      </div>

      {isRoot && (
        <div className="mt-1.5 text-[9px] font-mono tracking-widest uppercase text-white font-bold bg-[#D00000] px-1.5 py-0.5 rounded text-center">
          ROOT CAUSE
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-[#D00000] !w-2 !h-2 !border-none" />
    </div>
  );
}

interface ConceptGraphProps {
  sessionId: string;
  onSelectNode?: (node: ConceptNodeData) => void;
}

export function ConceptGraph({ sessionId, onSelectNode }: ConceptGraphProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeInspector, setActiveInspector] = useState<ConceptNodeData | null>(null);

  const nodeTypes = useMemo(() => ({ concept: ConceptCustomNode }), []);

  useEffect(() => {
    let mounted = true;
    api.getGraph(sessionId)
      .then((data) => {
        if (mounted) {
          setGraphData(data);
          setLoading(false);
          const rootNode = data.nodes.find((n) => n.status === "root");
          if (rootNode) {
            setActiveInspector({
              id: rootNode.id,
              label: rootNode.name,
              debt: rootNode.debt,
              status: rootNode.status,
              description: rootNode.description,
              level: rootNode.level,
            });
          }
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const { nodes, edges } = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };

    const levelCounts: Record<number, number> = {};

    const rfNodes: Node<ConceptNodeData>[] = graphData.nodes.map((n) => {
      const row = levelCounts[n.level] = (levelCounts[n.level] ?? -1) + 1;
      return {
        id: n.id,
        type: "concept",
        position: { x: n.level * 240 + 40, y: row * 105 + 40 },
        data: {
          id: n.id,
          label: n.name,
          debt: n.debt,
          status: n.status,
          description: n.description,
          level: n.level,
        },
      };
    });

    const rfEdges: Edge[] = graphData.edges.map((e) => {
      const sourceNode = graphData.nodes.find((n) => n.id === e.source);
      const targetNode = graphData.nodes.find((n) => n.id === e.target);
      const isTracePath =
        (sourceNode?.status === "root" || sourceNode?.status === "trace") &&
        (targetNode?.status === "trace" || targetNode?.status === "failed");

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: isTracePath,
        style: {
          stroke: isTracePath ? "#D00000" : "#35353B",
          strokeWidth: isTracePath ? 2.5 : 1,
        },
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [graphData]);

  if (loading) {
    return (
      <div className="h-[460px] rounded-3xl bg-[#2A2A2F] border border-[#35353B] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D00000] animate-spin mb-3" />
        <span className="text-xs font-mono text-[#9E9EA7]">COMPUTING KNOWLEDGE GRAPH TOPOLOGY...</span>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-[#2A2A2F] border border-[#35353B] overflow-hidden flex flex-col shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#35353B] flex items-center justify-between bg-[#1A1A1E]">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-[#D00000]" />
          <h3 className="font-display font-semibold text-base text-[#F3F3F4]">
            Interactive Prerequisite Graph
          </h3>
          <span className="text-xs text-[#9E9EA7] font-mono hidden sm:inline">
            (Columns represent curriculum levels 0 to 5)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#D00000]" />
            <span className="text-[#F3F3F4]">Root</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span className="text-[#9E9EA7]">Trace</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#35353B]" />
            <span className="text-[#9E9EA7]">Clear</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="h-[520px] w-full bg-[#0E0E10] relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            const nodeData = node.data as ConceptNodeData;
            setActiveInspector(nodeData);
            if (onSelectNode) onSelectNode(nodeData);
          }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#2A2A2F" gap={20} size={1} />
          <Controls className="!bg-[#2A2A2F] !border-[#35353B] !rounded-xl !text-white overflow-hidden" />
        </ReactFlow>

        {/* Floating Inspector Card */}
        {activeInspector && (
          <div className="absolute bottom-4 right-4 max-w-xs w-full p-4 rounded-2xl bg-[#2A2A2F]/95 backdrop-blur-md border border-[#35353B] shadow-2xl text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9E9EA7]">
                Level {activeInspector.level} Concept
              </span>
              <span className="text-xs font-mono font-bold text-[#D00000]">
                {Math.round(activeInspector.debt)}% debt
              </span>
            </div>

            <h4 className="font-display font-bold text-sm text-[#F3F3F4] mb-1">
              {activeInspector.label}
            </h4>

            <p className="text-xs text-[#9E9EA7] leading-relaxed font-sans mb-3">
              {activeInspector.description}
            </p>

            <div className="text-[10px] font-mono text-[#9E9EA7] flex items-center justify-between border-t border-[#35353B] pt-2">
              <span>STATUS: {activeInspector.status.toUpperCase()}</span>
              <span>NODE ID: {activeInspector.id}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
