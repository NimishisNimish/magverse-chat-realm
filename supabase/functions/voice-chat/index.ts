import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, upgrade, connection",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;

  socket.onopen = () => {
    console.log("Client connected to voice chat");
    
    // Connect to OpenAI Realtime API
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      socket.send(JSON.stringify({
        type: "error",
        message: "OpenAI API key not configured"
      }));
      socket.close();
      return;
    }

    const model = "gpt-4o-realtime-preview-2024-10-01";
    openAISocket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${model}`,
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    openAISocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
    };

    openAISocket.onmessage = (event) => {
      try {
        // Forward OpenAI messages to client
        socket.send(event.data);
      } catch (error) {
        console.error("Error forwarding OpenAI message:", error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      socket.send(JSON.stringify({
        type: "error",
        message: "OpenAI connection error"
      }));
    };

    openAISocket.onclose = () => {
      console.log("OpenAI WebSocket closed");
      socket.close();
    };
  };

  socket.onmessage = (event) => {
    try {
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        // Forward client messages to OpenAI
        openAISocket.send(event.data);
      }
    } catch (error) {
      console.error("Error forwarding client message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Client disconnected from voice chat");
    if (openAISocket) {
      openAISocket.close();
      openAISocket = null;
    }
  };

  return response;
});
