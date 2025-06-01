import { Header } from "@/components/layout/header";
import { SimulationStepper } from "@/components/simulation/simulation-stepper";

export default function SimulationConfigurePage() {
  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    { label: "Configuration de simulation" },
  ];

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <SimulationStepper />
      </div>
    </>
  );
}
