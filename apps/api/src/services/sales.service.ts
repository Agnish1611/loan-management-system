import { userRepository, type UserRepository } from "@/repositories/index.js";
import {
  formatSalesLeadDto,
  type SalesLeadQueryInput,
  type SalesLeadDto,
} from "@repo/types";

export class SalesService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async getLeads(input: SalesLeadQueryInput): Promise<SalesLeadDto[]> {
    const rawLeads = await this.userRepo.aggregateSalesLeads({
      stage: input.stage,
      search: input.search,
    });

    return rawLeads.map((doc) => formatSalesLeadDto(doc));
  }
}

export const salesService = new SalesService();
