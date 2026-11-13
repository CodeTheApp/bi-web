"use server";
import { ctx, run } from "@/server/admin/guard";
import { getShopRepo } from "./repo";
import {
  customerContactSchema,
  customerIdSchema,
  customerRecord,
} from "@/features/manage-customers/model/customer-contact";

export async function getCustomerAdmin(id: string) {
  return run(async () => {
    await ctx();
    const customer = await (
      await getShopRepo()
    ).customer(customerIdSchema.parse(id));
    if (!customer) throw new Error("Cliente não encontrado.");
    return customerRecord(customer);
  });
}
export async function getCustomerOrdersAdmin(id: string) {
  return run(async () => {
    await ctx();
    const repo = await getShopRepo();
    const customerId = customerIdSchema.parse(id);
    if (!(await repo.customer(customerId)))
      throw new Error("Cliente não encontrado.");
    return repo.customerOrders(customerId);
  });
}
export async function updateCustomerContact(id: string, input: unknown) {
  return run(async () => {
    const { repo: admin } = await ctx();
    const contact = customerContactSchema.parse(input);
    const customer = await (
      await getShopRepo()
    ).updateCustomer(customerIdSchema.parse(id), contact);
    await admin.log(`Contato de cliente atualizado: ${customer.name}`);
    return customerRecord(customer);
  });
}
