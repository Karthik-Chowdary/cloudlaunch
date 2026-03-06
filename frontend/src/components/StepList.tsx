import React, { useState } from 'react';
import {
  Box, Typography, IconButton, Tooltip, Paper, alpha, Button, Chip,
} from '@mui/material';
import {
  DragIndicator, Edit, Delete, Add, ArrowUpward, ArrowDownward, Code,
} from '@mui/icons-material';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LaunchStep } from '../types';
import StepEditor from './StepEditor';

interface StepListProps {
  steps: LaunchStep[];
  onChange: (steps: LaunchStep[]) => void;
}

function SortableStepItem({
  step,
  index,
  onEdit,
  onRemove,
}: {
  step: LaunchStep;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 1,
        bgcolor: (t) => alpha(t.palette.background.paper, 0.5),
      }}
    >
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', color: 'text.secondary' }}>
        <DragIndicator />
      </Box>

      <Chip
        label={index + 1}
        size="small"
        sx={{
          minWidth: 28,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
          color: 'primary.main',
          fontWeight: 700,
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" fontWeight={600} noWrap>
          {step.name}
        </Typography>
        {step.description && (
          <Typography variant="body2" noWrap>
            {step.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
          <Code sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {step.script.split('\n').filter((l) => l.trim() && !l.startsWith('#')).slice(0, 1).join(' ') || 'Empty script'}
          </Typography>
          {step.continueOnError && (
            <Chip label="continue-on-error" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
          )}
          <Chip label={`${step.timeout}s`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
        </Box>
      </Box>

      <Tooltip title="Edit">
        <IconButton size="small" onClick={onEdit}>
          <Edit fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Remove">
        <IconButton size="small" onClick={onRemove} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  );
}

export default function StepList({ steps, onChange }: StepListProps) {
  const [editingStep, setEditingStep] = useState<LaunchStep | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    const newSteps = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
    onChange(newSteps);
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setEditorOpen(true);
  };

  const handleEditStep = (step: LaunchStep) => {
    setEditingStep(step);
    setEditorOpen(true);
  };

  const handleRemoveStep = (stepId: string) => {
    const newSteps = steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i }));
    onChange(newSteps);
  };

  const handleSaveStep = (step: LaunchStep) => {
    if (editingStep) {
      const newSteps = steps.map((s) => (s.id === step.id ? { ...step, order: s.order } : s));
      onChange(newSteps);
    } else {
      onChange([...steps, { ...step, order: steps.length }]);
    }
  };

  return (
    <Box>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {steps.map((step, index) => (
            <SortableStepItem
              key={step.id}
              step={step}
              index={index}
              onEdit={() => handleEditStep(step)}
              onRemove={() => handleRemoveStep(step.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outlined"
        startIcon={<Add />}
        onClick={handleAddStep}
        fullWidth
        sx={{ mt: 1, borderStyle: 'dashed' }}
      >
        Add Step
      </Button>

      <StepEditor
        open={editorOpen}
        step={editingStep}
        onSave={handleSaveStep}
        onClose={() => setEditorOpen(false)}
      />
    </Box>
  );
}
