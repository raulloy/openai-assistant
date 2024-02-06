import express from 'express';
import config from './config.js';
import OpenAI from 'openai';
import Airtable from 'airtable';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = config.PORT;

const OPENAI_API_KEY = config.OPENAI_API_KEY;
const AIRTABLE_API_KEY = config.AIRTABLE_API_KEY;
// const AIRTABLE_BASE_ID = config.AIRTABLE_BASE_ID;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_API_KEY,
});

// const base = Airtable.base(AIRTABLE_BASE_ID);

app.get('/api/start', async (req, res) => {
  try {
    console.log('Starting a new conversation...');
    const thread = await openai.beta.threads.create();
    console.log(`New thread created with ID: ${thread.id}`);
    res.send({ thread_id: thread.id });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).send('Error starting a new conversation');
  }
});

app.post('/chat', async (req, res) => {
  try {
    const data = req.body;
    const threadId = data.thread_id;
    const userInput = data.message || '';

    if (!threadId) {
      console.log('Error: Missing thread_id');
      return res.status(400).json({ error: 'Missing thread_id' });
    }

    console.log(`Received message: ${userInput} for thread ID: ${threadId}`);

    // Add the user's message to the thread
    await openai.beta.threads.messages.create({
      thread_id: threadId,
      role: 'user',
      content: userInput,
    });

    // Run the Assistant
    const run = await openai.beta.threads.runs.create({
      thread_id: threadId,
      assistant_id: 'asst_RqDZo7ho03fEnvpRg0F0Ljk8',
    });

    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve({
        thread_id: threadId,
        run_id: run.id,
      });

      // Check for action requirements and handle them

      if (runStatus.status === 'requires_action') {
        for (const toolCall of runStatus.required_action.submit_tool_outputs
          .tool_calls) {
          if (toolCall.function.name === 'create_record') {
            const args = JSON.parse(toolCall.function.args);

            // Assuming args contain name, qty, product, and optionally date
            const output = await createRecord(
              args.name,
              args.qty,
              args.product
            );

            await openai.beta.threads.runs.submit_tool_outputs({
              thread_id: threadId,
              run_id: run.id,
              tool_outputs: [
                {
                  tool_call_id: toolCall.id,
                  output: JSON.stringify(output),
                },
              ],
            });
          }
        }
        // Add delay logic here if necessary
      }
    } while (runStatus.status !== 'completed');

    // Retrieve and return the latest message from the assistant
    const messages = await openai.beta.threads.messages.list({
      thread_id: threadId,
    });
    const response = messages.data[0].content[0].text.value;

    console.log(`Assistant response: ${response}`);
    res.json({ response: response });
  } catch (error) {
    console.error(`Error in /chat endpoint: ${error.message}`);
    res.status(500).send('Error processing chat request');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// app.use('/', (req, res) => {
//   res.send("<h2>I'm Aurora, an OpenAI Assistant</h2>");
// });
