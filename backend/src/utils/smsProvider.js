import axios from 'axios';

/**
 * Dispatches a bulk SMS via IprogSMS API
 * @param {string} phoneNumbers - Comma-separated list of phone numbers (e.g., "09171112222,09183334444")
 * @param {string} messageText - The message to send
 */
export const sendIprogBulkSMS = async (phoneNumbers, messageText) => {
    // 🛑 MOCK MODE ENABLED - NO REAL CREDITS WILL BE USED 🛑
    // Change this to 'false' only when you are ready for production!
    const isMockMode = true; 

    if (isMockMode) {
        console.log("\n=====================================================");
        console.log("🚨 MOCK SMS MODE ACTIVE - NO CREDITS USED 🚨");
        console.log(`📡 Sending to: ${phoneNumbers}`);
        console.log(`✉️ Message: ${messageText}`);
        console.log("=====================================================\n");
        
        // The 'return' here completely stops the function, so the real code below never runs!
        return { 
            status: 200, 
            message: "MOCK: Your bulk SMS messages have been successfully added to the queue.",
            message_ids: "mock-id-12345"
        };
    }

    // --- REAL IPROGSMS EXECUTION ---
    try {
        const IPROG_API_URL = process.env.IPROG_API_URL || "https://sms.iprogtech.com/api/v1/sms_messages/send_bulk"; 
        
        // Ensure you have IPROG_API_TOKEN="your_actual_token_here" in your backend's .env file!
        const IPROG_API_TOKEN = process.env.IPROG_API_TOKEN; 

        if (!IPROG_API_TOKEN) {
            console.error("🚨 Missing IPROG_API_TOKEN in environment variables!");
            throw new Error("SMS API Token is not configured.");
        }

        const payload = {
            api_token: IPROG_API_TOKEN,
            phone_number: phoneNumbers,
            message: messageText
        };

        const response = await axios.post(IPROG_API_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log("✅ IprogSMS Live Success:", response.data);
        return response.data;
        
    } catch (error) {
        console.error("❌ IprogSMS Live Error:", error.response?.data || error.message);
        throw new Error("Failed to dispatch SMS via IprogSMS");
    }
};