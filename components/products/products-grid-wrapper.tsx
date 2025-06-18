"use client";

import { Suspense } from "react";
import { ProductsGrid } from "./products-grid";

function ProductsGridContent() {
  return <ProductsGrid />;
}

export function ProductsGridWrapper() {
  return (
    <Suspense fallback={<div>Loading products...</div>}>
      <ProductsGridContent />
    </Suspense>
  );
}
