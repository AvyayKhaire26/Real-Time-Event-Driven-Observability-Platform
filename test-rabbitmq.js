const amqp = require("amqplib");

async function testConnection() {
  try {
    console.log("Connecting to RabbitMQ...");
    const connection = await amqp.connect("amqp://guest:guest@localhost:5672");
    console.log("✅ Connected to RabbitMQ successfully!");
    
    const channel = await connection.createChannel();
    console.log("✅ Channel created successfully!");
    
    await channel.assertExchange("test-exchange", "topic", { durable: true });
    console.log("✅ Exchange created successfully!");
    
    await connection.close();
    console.log("✅ RabbitMQ test complete!");
  } catch (error) {
    console.error("❌ RabbitMQ connection failed:", error.message);
  }
}

testConnection();