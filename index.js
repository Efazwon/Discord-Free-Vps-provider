const { Client, GatewayIntentBits } = require("discord.js");
const { exec } = require("child_process");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Replace with your bot token & admin ID
const botToken = "Replace_Your_Bot_Token"; // Replace with your bot token
const ADMIN_ID = "Replace_Your_Discord_User_ID"; // Replace with your actual Discord admin ID

// VPS data storage
let vpsData = {};

// Load existing VPS data from file
if (fs.existsSync("vpsData.json")) {
  vpsData = JSON.parse(fs.readFileSync("vpsData.json"));
}

// Log in to Discord
client.login(botToken);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args[0].toLowerCase();

  switch (command) {
    case "!admindeploy":
      if (message.author.id !== ADMIN_ID) return message.reply("❌ You are not authorized to use this command.");
      await deployVPS(message, args, true);
      break;
    case "!listvps":
      await listVPS(message);
      break;
    case "!remove":
      await removeVPS(message, args);
      break;
    case "!stop":
      await stopVPS(message, args);
      break;
    case "!regenssh":
      await regenSSH(message, args);
      break;
    default:
      message.reply("Made by KingPlazyOp.");
  }
});

// Deploy a new VPS with Tmate SSH link
async function deployVPS(message, args, isAdmin) {
  if (args.length < 4) {
    return message.reply("Usage: `!admindeploy <RAM> <Disk> <CPU>`");
  }

  const userID = message.author.id;
  const ram = args[1];
  const disk = args[2];
  const cpu = args[3];

  if (!isAdmin) {
    return message.reply("❌ You are not authorized to deploy a VPS.");
  }

  // Generate a unique VPS ID by using a combination of Date and random string
  const vpsID = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  vpsData[vpsID] = { owner: userID, ram, disk, cpu, status: "running", sshLink: "" };
  fs.writeFileSync("vpsData.json", JSON.stringify(vpsData, null, 2));

  message.reply(`✅ VPS deployed!\n🆔 VPS ID: ${vpsID}\n💾 RAM: ${ram} | Disk: ${disk} | CPU: ${cpu}`);

  generateSSH(vpsID, message, userID);  // Ensure SSH is generated per unique VPS
}

// Generate a new SSH session and update data
function generateSSH(vpsID, message, userID) {
  const sshSocket = `/tmp/tmate_${vpsID}.sock`;  // Unique socket file for each VPS ID
  exec(`tmate -S ${sshSocket} new-session -d && tmate -S ${sshSocket} wait tmate-ready && tmate -S ${sshSocket} display -p '#{tmate_ssh}'`, 
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Tmate Error: ${error.message}`);
        return message.reply("❌ Failed to generate SSH session.");
      }
      if (stderr) {
        console.error(`Tmate STDERR: ${stderr}`);
        return message.reply("❌ Error occurred while generating SSH session.");
      }

      const sshLink = stdout.trim();
      vpsData[vpsID].sshLink = sshLink;
      fs.writeFileSync("vpsData.json", JSON.stringify(vpsData, null, 2));

      client.users.fetch(userID).then((user) => {
        user.send(`🔑 SSH for VPS **${vpsID}**:\n\`${sshLink}\``);
      }).catch(() => {
        message.reply("❌ Unable to send DM. Please enable DMs.");
      });
  });
}

// Regenerate SSH link for a VPS
async function regenSSH(message, args) {
  if (args.length < 2) return message.reply("Usage: `!regenssh <VPS_ID>`");

  const vpsID = args[1];
  if (!vpsData[vpsID]) return message.reply("❌ VPS not found.");
  if (vpsData[vpsID].owner !== message.author.id && message.author.id !== ADMIN_ID) return message.reply("❌ You are not authorized.");

  message.reply(`🔄 Regenerating SSH link for VPS **${vpsID}**...`);
  generateSSH(vpsID, message, vpsData[vpsID].owner);
}

// List all deployed VPS
async function listVPS(message) {
  if (Object.keys(vpsData).length === 0) return message.reply("No VPS deployed yet.");

  let response = "**List of Deployed VPS:**\n";
  for (const [vpsID, details] of Object.entries(vpsData)) {
    response += `🆔 **ID:** ${vpsID} | 👤 Owner: <@${details.owner}> | 💾 RAM: ${details.ram} | Disk: ${details.disk} | CPU: ${details.cpu} | Status: ${details.status}\n`;
  }
  message.reply(response);
}

// Remove a VPS
async function removeVPS(message, args) {
  if (args.length < 2) return message.reply("Usage: `!remove <VPS_ID>`");

  const vpsID = args[1];
  if (!vpsData[vpsID]) return message.reply("❌ VPS not found.");
  if (vpsData[vpsID].owner !== message.author.id && message.author.id !== ADMIN_ID) return message.reply("❌ You are not authorized.");

  delete vpsData[vpsID];
  fs.writeFileSync("vpsData.json", JSON.stringify(vpsData, null, 2));
  message.reply(`🗑️ VPS **${vpsID}** removed.`);
}

// Stop a VPS
async function stopVPS(message, args) {
  if (args.length < 2) return message.reply("Usage: `!stop <VPS_ID>`");

  const vpsID = args[1];
  if (!vpsData[vpsID]) return message.reply("❌ VPS not found.");
  if (vpsData[vpsID].owner !== message.author.id && message.author.id !== ADMIN_ID) return message.reply("❌ You are not authorized.");

  vpsData[vpsID].status = "stopped";
  fs.writeFileSync("vpsData.json", JSON.stringify(vpsData, null, 2));
  message.reply(`⏹️ VPS **${vpsID}** stopped.`);
                      }
      
