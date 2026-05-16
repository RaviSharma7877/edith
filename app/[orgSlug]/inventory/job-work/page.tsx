import { InventoryPageShell } from "../_components/inventory-page-shell"

export default function JobWorkPage() {
  return (
    <InventoryPageShell
      title="Job Work Orders"
      description="Manage materials sent to or received from vendors for job work"
    >
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[rgba(55,50,47,0.14)] bg-white text-sm text-[#605A57]">
        Job Work Orders module is under development.
      </div>
    </InventoryPageShell>
  )
}
