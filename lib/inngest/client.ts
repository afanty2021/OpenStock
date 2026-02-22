import {Inngest} from "inngest"

export const inngest = new Inngest({
    id: "openStock",
    // 使用 MiniMax AI (OpenAI 兼容接口)
    ai: {
        openai: {
            apiKey: process.env.MINIMAX_API_KEY,
            baseURL: 'https://api.minimaxi.com/v1'
        }
    },
    // Add signing key for Vercel deployment
    signingKey: process.env.INNGEST_SIGNING_KEY,
})