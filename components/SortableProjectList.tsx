"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AppStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { ProjectCard } from "./ProjectCard";

/**
 * Wraps a list of projects with drag-and-drop reordering.
 * Dropping saves priority_order to Supabase immediately.
 */
export function SortableProjectList({
  projects,
  store,
}: {
  projects: Project[];
  store: AppStore;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = projects.map((p) => p.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(ids, oldIdx, newIdx);
    store.reorderProjects(reordered);
  }

  if (projects.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {projects.map((project) => (
          <SortableProjectCard key={project.id} project={project} store={store} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableProjectCard({ project, store }: { project: Project; store: AppStore }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      {/* Drag handle overlay — top-left corner */}
      <div
        className="absolute top-2 right-2 z-10 cursor-grab text-hairline hover:text-muted text-[14px] select-none touch-none"
        title="Arrastar para reordenar prioridade"
        {...attributes}
        {...listeners}
      >
        ⠿
      </div>
      <ProjectCard project={project} store={store} />
    </div>
  );
}
