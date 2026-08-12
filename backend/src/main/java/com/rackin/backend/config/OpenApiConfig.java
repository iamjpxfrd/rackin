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
                                spell does not double-record: replaying one returns the original result
                                instead of creating a second member, payment, or visit. Membership
                                status is derived from payment coverage, never stored.

                                Writes also accept the tablet's own timestamps (`createdAt`, `paidAt`,
                                `timestamp`) and its `memberId`. A gym with no wifi records everything
                                offline and pushes hours later, so a record that arrives late must still
                                land at the time it happened and keep the member number already printed
                                on that member's QR card. Omit them and the server fills them in.

                                Enum values are lowercase (`session`/`weekly`/`monthly`, `cash`/`transfer`,
                                `numpad`/`qr`/`search`) to match the tablet's contract verbatim."""))
                .servers(List.of(new Server()
                        .url("http://localhost:" + port)
                        .description("Local dev")));
    }
}
