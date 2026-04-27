package com.giovanny.ChatRealTime.websocket;

import com.giovanny.ChatRealTime.model.User;
import com.giovanny.ChatRealTime.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "username and password required"));
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Usuario ou senha invalidos"));
        }

        User user = userOpt.get();
        boolean matches = BCrypt.checkpw(password, user.getPasswordHash());
        if (!matches) {
            return ResponseEntity.status(401).body(Map.of("error", "Usuario ou senha invalidos"));
        }

        return ResponseEntity.ok(Map.of("username", user.getUsername()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null || username.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario ou senha invalidos"));
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "username already exists"));
        }

        String hashed = BCrypt.hashpw(password, BCrypt.gensalt());
        User user = new User(username, hashed);
        userRepository.save(user);

        return ResponseEntity.created(URI.create("/api/users/" + user.getId())).body(Map.of("username", user.getUsername()));
    }
}
