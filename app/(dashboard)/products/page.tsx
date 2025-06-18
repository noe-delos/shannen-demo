import { Header } from "@/components/layout/header";
import { ProductsGridWrapper } from "@/components/products/products-grid-wrapper";

export default function ProductsPage() {
  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    { label: "Produits" },
  ];

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <ProductsGridWrapper />
      </div>
    </>
  );
}
