import { z } from "zod";

export const recordSchema = z.record(z.string(), z.unknown());

export const stringRecordSchema = z.record(z.string(), z.string());
