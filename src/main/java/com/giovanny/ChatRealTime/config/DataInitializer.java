package com.giovanny.ChatRealTime.config;

import com.giovanny.ChatRealTime.model.User;
import com.giovanny.ChatRealTime.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCrypt;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner init(UserRepository userRepository) {
        return args -> {
            if (userRepository.findByUsername("Miguel").isEmpty()) {
                String hashed = BCrypt.hashpw("123456", BCrypt.gensalt());
                userRepository.save(new User("Miguel", hashed));
            }

            // create user 'maria' if not exists
            if (userRepository.findByUsername("Maria").isEmpty()) {
                String hashedMaria = BCrypt.hashpw("12345", BCrypt.gensalt());
                userRepository.save(new User("Maria", hashedMaria));
            }
        };
    }
}
