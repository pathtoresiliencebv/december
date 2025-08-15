import express from "express";
import * as llmService from "../services/llm";
import { saveChatMessage, getChatHistory } from "../services/database.js";

const router = express.Router();

//@ts-ignore
router.post("/:containerId/messages", async (req, res) => {
  const { containerId } = req.params;
  const { message, attachments = [], stream = false } = req.body;
  const sessionId = req.headers['session-id'] as string || 'default';

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      error: "Message is required",
    });
  }

  try {
    // Save user message to database
    await saveChatMessage({
      containerId,
      sessionId,
      role: 'user',
      content: message,
      attachments
    });

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const messageStream = llmService.sendMessageStream(
        containerId,
        message,
        attachments
      );

      let assistantResponse = '';
      for await (const chunk of messageStream) {
        if (chunk.type === 'content' && chunk.data?.content) {
          assistantResponse += chunk.data.content;
        }
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      // Save assistant message to database
      if (assistantResponse) {
        await saveChatMessage({
          containerId,
          sessionId,
          role: 'assistant',
          content: assistantResponse,
          attachments: []
        });
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      const { userMessage, assistantMessage } = await llmService.sendMessage(
        containerId,
        message,
        attachments
      );

      // Save assistant message to database
      await saveChatMessage({
        containerId,
        sessionId,
        role: 'assistant',
        content: assistantMessage.content,
        attachments: assistantMessage.attachments || []
      });

      res.json({
        success: true,
        userMessage,
        assistantMessage,
      });
    }
  } catch (error) {
    console.log(error);
    if (stream) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          data: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        })}\n\n`
      );
      res.end();
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});

router.get("/:containerId/messages", async (req, res) => {
  const { containerId } = req.params;
  const sessionId = req.headers['session-id'] as string || 'default';

  try {
    const messages = await getChatHistory(containerId, sessionId);

    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments,
        timestamp: msg.created_at
      })),
      sessionId: sessionId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
