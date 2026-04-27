package com.giovanny.ChatRealTime.websocket;

import com.giovanny.ChatRealTime.model.ChatMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("Conexao estabelecida: " + session.getId());
        sessions.put(session.getId(), session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String messagePayload = message.getPayload();
        System.out.println("Mensagem recebida: " + messagePayload);

        ChatMessage chatMessage = objectMapper.readValue(messagePayload, ChatMessage.class);
        normalizeMessage(chatMessage);

        if (chatMessage.getUsername().isBlank() || chatMessage.getMessage().isBlank()) {
            return;
        }

        String outMessage = objectMapper.writeValueAsString(chatMessage);

        sessions.forEach((sessionId, currentSession) -> {
            if (!currentSession.isOpen()) {
                sessions.remove(sessionId);
                return;
            }

            try {
                currentSession.sendMessage(new TextMessage(outMessage));
            } catch (Exception exception) {
                exception.printStackTrace();
            }
        });
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        System.out.println("Conexao fechada: " + session.getId());
        sessions.remove(session.getId());
    }

    private void normalizeMessage(ChatMessage chatMessage) {
        String username = chatMessage.getUsername() == null ? "" : chatMessage.getUsername().trim();
        String content = chatMessage.getMessage() == null ? "" : chatMessage.getMessage().trim();

        chatMessage.setUsername(username);
        chatMessage.setMessage(content);
    }
}
