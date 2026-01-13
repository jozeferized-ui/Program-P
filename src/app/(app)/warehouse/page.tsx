import { WarehouseManager } from "@/components/warehouse/WarehouseManager";
import { getWarehouseItems } from "@/actions/warehouse";
import { getAllOrders } from "@/actions/orders";

export default async function WarehousePage() {
    const items = await getWarehouseItems();
    const orders = await getAllOrders();

    return <WarehouseManager initialItems={items} initialOrders={orders} />;
}
