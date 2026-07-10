import { z } from "zod";
import { THESIS_SECTIONS } from "@archprep/shared";

export const thesisSectionKeySchema = z.enum(THESIS_SECTIONS);
