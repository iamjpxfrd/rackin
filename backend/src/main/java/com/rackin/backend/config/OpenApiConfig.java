package com.rackin.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI rackinOpenApi(@Value("${server.port:8080}") int port) {
        return new OpenAPI()
                .info(new Info()
                        .title("Rackin Sync API")
                        .version("0.0.1-SNAPSHOT")
                        .description("""
                                Sync endpoints for the Rackin gym tablet.

                                All writes carry a `clientUuid` so a tablet that retries after an offline
                                spell does not double-record. Membership status is derived from payment
                                coverage, never stored.

                                Enum values are lowercase (`weekly`/`monthly`, `cash`/`transfer`,
                                `numpad`/`qr`/`search`) to match the tablet's contract verbatim."""))
                .servers(List.of(new Server()
                        .url("http://localhost:" + port)
                        .description("Local dev")));
    }
}
