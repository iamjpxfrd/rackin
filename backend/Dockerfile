# Render has no native Java runtime (node/python/elixir/go/ruby/rust only,
# per Render's own docs) — this is required for any Java deploy there, not
# an environment-specific choice. Multi-stage: the build stage needs the
# full JDK + Maven; the runtime image only needs a JRE to run the jar.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
# Dependencies resolved before the source copies in, so an app-code-only
# change reuses this layer instead of re-downloading the whole repo.
RUN ./mvnw dependency:go-offline -B
COPY src src
# Tests run in CI, not the deploy build - a flaky/slow build environment
# should not be able to block a deploy of code CI already passed.
RUN ./mvnw clean package -DskipTests -B

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
