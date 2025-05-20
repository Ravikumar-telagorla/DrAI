"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Container,
  TextField,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

export default function Home() {
  const [messages, setMessages] = useState([
    { from: "ai", text: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    // Add user message
    setMessages((prev) => [...prev, { from: "user", text: userMessage }]);
    setLoading(true);

    // Temporary "typing..." indicator
    setMessages((prev) => [...prev, { from: "ai", text: "typing..." }]);

    try {
      const res = await fetch("http://localhost:5000/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage }),
      });
      const data = await res.json();

      // Remove the "..." placeholder
      setMessages((prev) => prev.slice(0, -1));

      if (res.ok) {
        setMessages((prev) => [...prev, { from: "ai", text: data.response }]);
      } else {
        setMessages((prev) => [...prev, { from: "ai", text: "Sorry, something went wrong." }]);
        console.error("API error:", data.error);
      }
    } catch (error) {
      setMessages((prev) => prev.slice(0, -1));
      setMessages((prev) => [...prev, { from: "ai", text: "Sorry, something went wrong." }]);
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  interface Message {
    from: "ai" | "user";
    text: string;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{ display: "flex", flexDirection: "column", height: "100vh", pt: 2 }}
    >
      <Typography variant="h5" align="center" gutterBottom>
        Mini ChatGPT
      </Typography>

      <Paper
        elevation={3}
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 2,
          mb: 2,
          borderRadius: 2,
          bgcolor: "#f5f5f7",
        }}
      >
        {messages.map((msg, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
              mb: 1,
            }}
          >
            <Box
              sx={{
                maxWidth: "70%",
                bgcolor: msg.from === "user" ? "#1976d2" : "#e0e0e0",
                color: msg.from === "user" ? "white" : "black",
                p: 1.5,
                borderRadius: 2,
                whiteSpace: "pre-line",
              }}
            >
              {msg.text}
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Paper>

      <Box sx={{ display: "flex" }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <IconButton color="primary" onClick={handleSend} sx={{ ml: 1 }} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Container>
  );
}
