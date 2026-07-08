import { Elysia } from "elysia";
import authRoutes from "./auth-routes";

export const authPlugin = new Elysia({ name: "Module.Auth" }).use(authRoutes);

export default authPlugin;
