import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const srsWhepUrl = env.SRS_WHEP_URL;

export const POST: RequestHandler = async ({ request, locals }) => {
  // API Route Guard: Check for a valid session
  if (!locals.user) {
    throw error(
      401,
      "Unauthorized: You must be verified to access the stream."
    );
  }

  if (!srsWhepUrl) {
    throw error(
      500,
      "SRS_WHEP_URL is not defined in the environment variables."
    );
  }

  try {
    // Fetch the public IP from ipify
    const ipResponse = await fetch("https://api.ipify.org");
    if (!ipResponse.ok) {
      throw error(500, "Failed to fetch public IP from ipify.org");
    }
    const candidateIp = await ipResponse.text();

    // Append the resolved IP as the 'eip' (external IP) query parameter for SRS
    const srsUrlWithCandidate = new URL(srsWhepUrl);
    srsUrlWithCandidate.searchParams.set("eip", candidateIp);

    const offerSdp = await request.text();

    if (!offerSdp) {
      throw error(400, "SDP offer is required in the request body.");
    }

    // Forward the request to SRS with the dynamic candidate IP
    const response = await fetch(srsUrlWithCandidate.toString(), {
      method: "POST",
      body: offerSdp,
      headers: {
        "Content-Type": "application/sdp",
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(
        `Error from SRS server: ${response.status} ${response.statusText}`,
        responseText
      );
      throw error(
        response.status,
        `Failed to connect to SRS server: ${responseText}`
      );
    }

    const answerSdp = await response.text();

    // Return the SDP answer from SRS back to the client
    return new Response(answerSdp, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
      },
    });
  } catch (e: any) {
    console.error("Error in WHEP proxy endpoint:", e);
    if (e.status) {
      throw e;
    }
    throw error(
      500,
      "An internal error occurred while proxying the WHEP request."
    );
  }
};
