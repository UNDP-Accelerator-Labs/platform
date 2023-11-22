exports.isPasswordSecure = (password) => {
  // Check complexity (contains at least one uppercase, lowercase, number, and special character)
  const minlength = 8
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const numberRegex = /[0-9]/;
  const specialCharRegex = /[!@#$%^&*\(\)]/;
  // Check against common passwords (optional)
  const commonPasswords = ['password', '123456', 'qwerty', 'azerty'];
  const isUpper = uppercaseRegex.test(password);
	const isLower = lowercaseRegex.test(password);
	const isNumber = numberRegex.test(password);
	const isSpecial = specialCharRegex.test(password);
	const groups = [isUpper, isLower, isNumber, isSpecial].reduce((p, v) => p + (v ? 1 : 0), 0);
  const checkPass = {
    'pw-length': !(password.length < minlength),
    'pw-groups': groups >= 3,
    'pw-common': !commonPasswords.includes(password),
  };

  const msgs = {
    'pw-length': 'Password is too short',
    'pw-groups': 'Password requires three character groups out of uppercase letters, lowercase letters, numbers, or special characters !@#$%^&*()',
    'pw-common': 'Password cannot be a commonly used password',
  };

  return Object.keys(checkPass).filter((key) => !checkPass[key]).map((key) => msgs[key]).join('\n');
}
