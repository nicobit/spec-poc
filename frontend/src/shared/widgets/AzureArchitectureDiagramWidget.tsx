import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  NodeChange,
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMsal } from '@azure/msal-react';
import { Cloud } from 'lucide-react';

import { getAzureDiagram } from '@/shared/widgets/api/azureDiagram';

import FlowCustomNode from './FlowCustomNode';

const AzureArchitectureDiagram: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const { instance } = useMsal();

  const nodeTypes = useMemo(() => ({ custom: FlowCustomNode }), []);

  useEffect(() => {
    const root = document.querySelector('.react-flow') as HTMLElement | null;
    let element = root;

    while (element) {
      const style = getComputedStyle(element);
      if (style.overflow === 'hidden' || style.pointerEvents === 'none' || style.zIndex === '0') {
        console.warn('Potential interfering parent:', element, style);
      }
      element = element.parentElement;
    }
  }, []);

  useEffect(() => {
    const fetchDiagramData = async () => {
      try {
        await instance.initialize();
        const data = await getAzureDiagram(instance);
        const updatedNodes = data.nodes.map((node: Node) => ({
          ...node,
          type: 'custom',
          draggable: true,
        }));
        setNodes(updatedNodes);
        setEdges(data.edges);
      } catch (error) {
        console.error('Error loading Azure diagram:', error);
      }
    };

    void fetchDiagramData();
  }, [instance]);

  const handleNodesChange = (changes: NodeChange[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  return (
    <div className="relative h-full min-h-[600px] w-full overflow-visible">
      {nodes.length > 0 ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          panOnDrag
          nodesDraggable
          onNodesChange={handleNodesChange}
          fitView
        >
          <Background color="color-mix(in srgb, var(--text-muted) 24%, transparent)" />
          <Controls className="ui-panel rounded p-1 shadow-[var(--shadow-panel)]" />
        </ReactFlow>
      ) : null}
    </div>
  );
};

export const icon = <Cloud className="h-6 w-6 text-[var(--accent-primary)]" />;
export default AzureArchitectureDiagram;
