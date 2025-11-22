import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const MSG91_API_KEY = Deno.env.get("MSG91_API_KEY");
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");
const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");

interface AlertRequest {
  adminEmails: string[];
  adminPhones: string[];
  modelName: string;
  status: 'down' | 'degraded' | 'recovered' | 'predictive_warning';
  details: string;
  metadata?: any;
}

interface SlackMessage {
  text?: string;
  blocks?: Array<{
    type: string;
    text?: { type: string; text: string };
    fields?: Array<{ type: string; text: string }>;
  }>;
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp: string;
  footer?: { text: string };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getStatusColor = (status: string): { slack: string; discord: number } => {
  switch (status) {
    case 'down':
      return { slack: '#dc2626', discord: 0xdc2626 }; // Red
    case 'degraded':
      return { slack: '#eab308', discord: 0xeab308 }; // Yellow
    case 'recovered':
      return { slack: '#16a34a', discord: 0x16a34a }; // Green
    case 'predictive_warning':
      return { slack: '#f97316', discord: 0xf97316 }; // Orange
    default:
      return { slack: '#6b7280', discord: 0x6b7280 }; // Gray
  }
};

const sendSlackNotification = async (
  modelName: string,
  status: string,
  details: string,
  metadata: any,
  emoji: string
) => {
  if (!SLACK_WEBHOOK_URL) {
    console.log('Slack webhook not configured, skipping');
    return;
  }

  const colors = getStatusColor(status);
  
  const slackMessage: SlackMessage = {
    text: `${emoji} Model Health Alert: ${modelName}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${modelName} - ${status.toUpperCase().replace('_', ' ')}`,
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Status:*\n${status.toUpperCase().replace('_', ' ')}`
          },
          {
            type: "mrkdwn",
            text: `*Time:*\n${new Date().toLocaleString()}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Details:*\n${details}`
        }
      }
    ]
  };

  // Add metadata if available
  if (metadata) {
    slackMessage.blocks?.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Additional Info:*\n\`\`\`${JSON.stringify(metadata, null, 2)}\`\`\``
      }
    });
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      console.error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    } else {
      console.log("✅ Slack notification sent");
    }
  } catch (error) {
    console.error("Error sending Slack notification:", error);
  }
};

const sendDiscordNotification = async (
  modelName: string,
  status: string,
  details: string,
  metadata: any,
  emoji: string
) => {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('Discord webhook not configured, skipping');
    return;
  }

  const colors = getStatusColor(status);
  
  const embed: DiscordEmbed = {
    title: `${emoji} ${modelName} - ${status.toUpperCase().replace('_', ' ')}`,
    description: details,
    color: colors.discord,
    fields: [
      {
        name: "Status",
        value: status.toUpperCase().replace('_', ' '),
        inline: true
      },
      {
        name: "Time",
        value: new Date().toLocaleString(),
        inline: true
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Magverse AI Model Health Monitor"
    }
  };

  // Add metadata fields
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value !== 'object') {
        embed.fields?.push({
          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: String(value),
          inline: true
        });
      }
    }
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
        username: "Magverse AI Monitor",
      }),
    });

    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    } else {
      console.log("✅ Discord notification sent");
    }
  } catch (error) {
    console.error("Error sending Discord notification:", error);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminEmails, adminPhones, modelName, status, details, metadata }: AlertRequest = await req.json();

    const statusEmojis = {
      down: '🔴',
      degraded: '🟡',
      recovered: '🟢',
      predictive_warning: '🟠',
    };

    const emoji = statusEmojis[status] || '⚠️';
    const subject = `${emoji} Model Health Alert: ${modelName} ${status.toUpperCase()}`;

    // Send email alerts
    if (adminEmails && adminEmails.length > 0 && RESEND_API_KEY) {
      const emailPromises = adminEmails.map(async (email) => {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                .status-down { background: #fee; color: #c00; }
                .status-degraded { background: #ffc; color: #960; }
                .status-recovered { background: #efe; color: #060; }
                .status-predictive { background: #ffe; color: #c60; }
                .details { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${emoji} Model Health Alert</h1>
                  <p style="margin: 0; opacity: 0.9;">Automated health monitoring detected an issue</p>
                </div>
                <div class="content">
                  <h2 style="margin-top: 0;">${modelName}</h2>
                  <span class="status status-${status}">${status.toUpperCase().replace('_', ' ')}</span>
                  
                  <div class="details">
                    <h3 style="margin-top: 0;">Details</h3>
                    <p>${details}</p>
                    ${metadata ? `
                      <h4>Additional Information</h4>
                      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(metadata, null, 2)}</pre>
                    ` : ''}
                  </div>

                  <p style="color: #666; font-size: 14px;">
                    This alert was sent at ${new Date().toLocaleString()} IST
                  </p>
                </div>
                <div class="footer">
                  <p>Magverse AI - Model Health Monitoring System</p>
                  <p>To configure alert preferences, visit your admin settings.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        return fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Magverse AI <alerts@resend.dev>",
            to: [email],
            subject: subject,
            html: emailHtml,
          }),
        });
      });

      await Promise.all(emailPromises);
      console.log(`✅ Sent email alerts to ${adminEmails.length} admin(s)`);
    }

    // Send SMS alerts
    if (adminPhones && adminPhones.length > 0 && MSG91_API_KEY) {
      const smsMessage = `${emoji} ${modelName} ${status.toUpperCase()}: ${details}`;

      const smsPromises = adminPhones.map(async (phone) => {
        // Remove any non-digit characters and ensure it starts with country code
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

        return fetch(`https://api.msg91.com/api/v5/flow/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "authkey": MSG91_API_KEY,
          },
          body: JSON.stringify({
            flow_id: "YOUR_FLOW_ID", // Replace with your MSG91 flow ID
            sender: "MAGVRS", // Your approved sender ID
            mobiles: formattedPhone,
            message: smsMessage,
          }),
        });
      });

      await Promise.all(smsPromises);
      console.log(`✅ Sent SMS alerts to ${adminPhones.length} admin(s)`);
    }

    // Send Slack notification
    await sendSlackNotification(modelName, status, details, metadata, emoji);

    // Send Discord notification
    await sendDiscordNotification(modelName, status, details, metadata, emoji);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: adminEmails?.length || 0,
        smsSent: adminPhones?.length || 0,
        slackSent: !!SLACK_WEBHOOK_URL,
        discordSent: !!DISCORD_WEBHOOK_URL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending alerts:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
