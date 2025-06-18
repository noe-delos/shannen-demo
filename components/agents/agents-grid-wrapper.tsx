"use client";

import { Suspense } from "react";
import { AgentsGrid } from "./agents-grid";

function AgentsGridContent() {
  return <AgentsGrid />;
}

export function AgentsGridWrapper() {
  return (
    <Suspense fallback={<div>Loading agents...</div>}>
      <AgentsGridContent />
    </Suspense>
  );
}
