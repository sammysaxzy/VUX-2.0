import type { Customer } from "@/types";
import { TableCell } from "@/components/ui/table";

type Props = {
  customer: Customer;
};

export function CustomerContactCells({ customer }: Props) {
  return (
    <>
      <TableCell>{customer.phone || "-"}</TableCell>
      <TableCell>{customer.email || "-"}</TableCell>
      <TableCell className="max-w-[320px]">
        <p className="truncate" title={customer.address || "-"}>
          {customer.address || "-"}
        </p>
      </TableCell>
    </>
  );
}
