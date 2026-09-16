import { userRepository, type UserRepository } from "@/repositories/index.js";
import { NotFoundError } from "@/errors/index.js";
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

  async getLeadById(userId: string): Promise<SalesLeadDto> {
    const rawLeads = await this.userRepo.aggregateSalesLeads({
      userId,
    });
    if (!rawLeads.length || !rawLeads[0]) {
      throw new NotFoundError(`Sales lead with ID ${userId} not found`);
    }
    return formatSalesLeadDto(rawLeads[0]);
  }
}

export const salesService = new SalesService();
