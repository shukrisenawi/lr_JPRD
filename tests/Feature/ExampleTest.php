<?php

it('redirects root to dashboard', function () {
    $this->get('/')
        ->assertRedirect('/dashboard');
});
