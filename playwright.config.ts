
import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"tests/browser",timeout:30000,use:{baseURL:"http://127.0.0.1:3000",browserName:"chromium"},webServer:{command:"npm run start -- --hostname 127.0.0.1",url:"http://127.0.0.1:3000",reuseExistingServer:!process.env.CI,env:{NOVA_ENABLE_OFFLINE_DEMO:"1"}},reporter:"list"});
