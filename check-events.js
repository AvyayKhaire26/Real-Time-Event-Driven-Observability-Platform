const amqp = require("amqplib/callback_api");

amqp.connect("amqp://guest:guest@localhost:5672", (err, conn) => {
  if (err) {
    console.error("❌ Failed to connect:", err.message);
    process.exit(1);
  }

  conn.createChannel((err, ch) => {
    if (err) {
      console.error("❌ Failed to create channel:", err.message);
      process.exit(1);
    }

    const queues = ["logs-queue", "metrics-queue", "traces-queue"];
    
    queues.forEach(queue => {
      ch.checkQueue(queue, (err, ok) => {
        if (err) {
          console.log(`❌ Queue ${queue} not found`);
        } else {
          console.log(`✅ Queue ${queue} exists`);
          console.log(`   Messages: ${ok.messageCount}`);
          console.log(`   Consumers: ${ok.consumerCount}`);
        }
      });
    });

    setTimeout(() => {
      conn.close();
      process.exit(0);
    }, 1000);
  });
});