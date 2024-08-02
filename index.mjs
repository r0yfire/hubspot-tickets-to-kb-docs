import "dotenv/config";
import {join} from "node:path";
import {main} from "./src/main.mjs";

// Run the main function
(async () => {
    const filePath = join(process.cwd(), "tickets.csv");
    await main(filePath);
})();