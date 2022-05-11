<?php
$postContents = file_get_contents('php://input');
preg_match('/\{"fileName":"([^"]*)/', $postContents, $matches);

file_put_contents("resources/$matches[1]", $postContents);