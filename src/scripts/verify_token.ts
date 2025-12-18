import axios from 'axios';

const token = "840834885233660|tlB1dVFt5x652kwf_vzzlhrLb0w";

async function verify() {
    try {
        console.log("Verifying token...");
        const url = `https://graph.threads.net/v1.0/me?fields=id&access_token=${token}`;
        const response = await axios.get(url);
        console.log("Success!");
        console.log("User ID:", response.data.id);
        console.log("Username:", response.data.username);
    } catch (error: any) {
        console.error("Error verifying token:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

verify();
