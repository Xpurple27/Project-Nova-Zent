import type { NextConfig } from "next";
import {assertProductionEnvironment} from "./src/lib/validation/environment";
assertProductionEnvironment(process.env);
const config: NextConfig = { poweredByHeader: false };
export default config;
