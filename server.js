import express from 'express';
import config from './config.js';
import OpenAI from 'openai';
import Airtable from 'airtable';
import cors from 'cors';
import { createRecord } from './functions.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = config.PORT;

const OPENAI_API_KEY = config.OPENAI_API_KEY;
const AIRTABLE_API_KEY = config.AIRTABLE_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_API_KEY,
});

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

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userInput,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: 'asst_jMxT3zLGZXlxCOW52vTzX69Z',
    });

    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      // Check for action requirements and handle them
      if (runStatus.status === 'requires_action') {
        console.log(runStatus.required_action.submit_tool_outputs.tool_calls);

        // Collect orders from all tool calls
        let orders =
          runStatus.required_action.submit_tool_outputs.tool_calls.map(
            (toolCall) => {
              const args = JSON.parse(toolCall.function.arguments);
              return {
                customer: args.customer,
                quantity: args.quantity,
                product: args.product,
              };
            }
          );

        console.log('Orders ', orders);

        // Call createRecord with the collected orders
        if (orders.length > 0) {
          const output = await createRecord(orders);

          // Prepare tool_outputs for each tool call
          let toolOutputs =
            runStatus.required_action.submit_tool_outputs.tool_calls.map(
              (toolCall) => ({
                tool_call_id: toolCall.id,
                output: JSON.stringify(output),
              })
            );

          // Submitting tool outputs for the entire batch
          await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
            tool_outputs: toolOutputs,
          });
        }
      }
    } while (runStatus.status !== 'completed');

    // Retrieving and return the latest message from the assistant
    const messages = await openai.beta.threads.messages.list(threadId);
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
