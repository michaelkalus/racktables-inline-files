<?php

// RackTables Inline Files - plugin (new plugin architecture, RackTables 0.21+).
//
// 1) Server side: viewable file types (PDF, images, plain text) are sent with
//    "Content-Disposition: inline", so the browser opens them instead of
//    downloading. Other types stay "attachment". The file name is sent in
//    RFC 5987 form, so names with spaces and non-ASCII characters survive.
//    Done with header_register_callback(), no RackTables core file is changed.
// 2) Client side (js/inlinefiles.js): download links open in a new tab, and
//    images open in an in-page viewer with previous/next navigation.
//
// No database tables, no config variables: install/uninstall only toggle it.

function plugin_inlinefiles_info ()
{
	return array
	(
		'name' => 'inlinefiles',
		'longname' => 'Inline Files',
		'version' => '1.0.1',
		'home_url' => '',
	);
}

function plugin_inlinefiles_init ()
{
	if (isset ($_REQUEST['module']) && $_REQUEST['module'] === 'download')
		header_register_callback ('plugin_inlinefiles_fix_headers');
	else
	{
		addCSSInternal ('inlinefiles/css/inlinefiles.css');
		addJSInternal ('inlinefiles/js/inlinefiles.js');
	}
}

// Types the browser may show inline. Deliberately no text/html and no SVG:
// an uploaded file must not be able to run script in the RackTables origin.
function plugin_inlinefiles_is_viewable ($content_type)
{
	return (bool) preg_match ('~^(application/pdf|image/(jpeg|png|gif|webp)|text/plain)\s*(;|$)~i', $content_type);
}

// Runs right before PHP sends the headers of a module=download response.
// RackTables sends "Content-Disposition: attachment; filename=<raw name>"
// unless asattach=no was requested.
function plugin_inlinefiles_fix_headers ()
{
	$type = '';
	$name = NULL;
	foreach (headers_list () as $h)
	{
		if (stripos ($h, 'Content-Type:') === 0)
			$type = trim (substr ($h, strlen ('Content-Type:')));
		elseif (preg_match ('~^Content-Disposition:\s*attachment;\s*filename=(.*)$~i', $h, $m))
			$name = $m[1];
	}
	if ($name === NULL) // asattach=no, an error page, or something else: leave as is
		return;
	$disposition = plugin_inlinefiles_is_viewable ($type) ? 'inline' : 'attachment';
	header ("Content-Disposition: {$disposition}; filename*=UTF-8''" . rawurlencode ($name), TRUE);
	header ('X-Content-Type-Options: nosniff');
}

function plugin_inlinefiles_install ()
{
	return TRUE;
}

function plugin_inlinefiles_uninstall ()
{
	return TRUE;
}

function plugin_inlinefiles_upgrade ()
{
	return TRUE;
}
