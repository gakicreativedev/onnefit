import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export function useAIChat(functionName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Use ref to always have latest messages in the callback (avoids stale closure)
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const send = useCallback(async (input: string) => {
    if (isLoading) return; // Prevent double sends
    
    const userMsg: ChatMessage = { role: "user", content: input };
    const allMessages = [...messagesRef.current, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        // Remove the user message we just added
        setMessages(messagesRef.current.filter((_, i) => i < messagesRef.current.length));
        setIsLoading(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        if (resp.status === 429) {
          toast.error("Limite de requisições excedido. Aguarde alguns instantes e tente novamente.");
        } else if (resp.status === 402) {
          toast.error("Créditos insuficientes para usar a IA.");
        } else {
          toast.error(err.error || "Erro ao gerar resposta");
        }
        // Remove the user message on error so user can retry
        setMessages((prev) => prev.filter((m) => m !== userMsg));
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        toast.error("Resposta vazia do servidor");
        setMessages((prev) => prev.filter((m) => m !== userMsg));
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch { /* ignore */ }
        }
      }
      
      // If no assistant content was received, show error
      if (!assistantSoFar) {
        toast.error("Nenhuma resposta recebida da IA. Tente novamente.");
        setMessages((prev) => prev.filter((m) => m !== userMsg));
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conectar com a IA. Verifique sua conexão.");
      // Remove user message on network error
      setMessages((prev) => prev.filter((m) => m !== userMsg));
    } finally {
      setIsLoading(false);
    }
  }, [functionName, isLoading]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, isLoading, send, clear };
}

// Parse single workout JSON from AI response (first match)
export function parseWorkoutJson(text: string) {
  const match = text.match(/<workout_json>\s*([\s\S]*?)\s*<\/workout_json>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Parse ALL workout JSONs from AI response (for weekly plans)
export function parseAllWorkoutJsons(text: string) {
  const regex = /<workout_json>\s*([\s\S]*?)\s*<\/workout_json>/g;
  const results: any[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      results.push(JSON.parse(match[1]));
    } catch { /* skip malformed */ }
  }
  return results.length > 0 ? results : null;
}

// Parse diet JSON from AI response (first match)
export function parseDietJson(text: string) {
  const match = text.match(/<diet_json>\s*([\s\S]*?)\s*<\/diet_json>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Parse ALL diet JSONs from AI response (for weekly plans)
export function parseAllDietJsons(text: string) {
  const regex = /<diet_json>\s*([\s\S]*?)\s*<\/diet_json>/g;
  const results: any[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      results.push(JSON.parse(match[1]));
    } catch { /* skip malformed */ }
  }
  return results.length > 0 ? results : null;
}

// Strip JSON tags from display text
export function stripJsonTags(text: string) {
  return text
    .replace(/<workout_json>[\s\S]*?<\/workout_json>/g, "")
    .replace(/<diet_json>[\s\S]*?<\/diet_json>/g, "")
    .trim();
}
