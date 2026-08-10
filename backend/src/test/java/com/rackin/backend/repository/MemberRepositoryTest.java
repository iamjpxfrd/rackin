package com.rackin.backend.repository;

import com.rackin.backend.model.Member;
import com.rackin.backend.model.PlanType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class MemberRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    private Member member(String id) {
        Member member = new Member();
        member.setId(id);
        member.setName("Maria Santos");
        member.setPlanType(PlanType.monthly);
        member.setCreatedAt(Instant.now());
        member.setClientUuid(UUID.randomUUID());
        return member;
    }

    @Test
    void findMaxNumericId_whenNoMembers_shouldReturnOneThousand() {
        assertThat(memberRepository.findMaxNumericId()).isEqualTo(1000);
    }

    @Test
    void findMaxNumericId_whenMembersExist_shouldReturnHighestId() {
        memberRepository.saveAndFlush(member("1001"));
        memberRepository.saveAndFlush(member("1050"));
        memberRepository.saveAndFlush(member("1005"));

        assertThat(memberRepository.findMaxNumericId()).isEqualTo(1050);
    }
}
